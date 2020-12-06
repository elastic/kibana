/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiAccordion,
  EuiLink,
  EuiSwitch,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../../../src/plugins/data/common';
import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';

import {
  isEsIndices,
  isPostTransformsPreviewResponseSchema,
} from '../../../../../../common/api_schemas/type_guards';
import { TransformId, TransformPivotConfig } from '../../../../../../common/types/transform';
import { isValidIndexName } from '../../../../../../common/utils/es_utils';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';
import { isHttpFetchError } from '../../../../common/request';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { SearchItems } from '../../../../hooks/use_search_items';
import { useApi } from '../../../../hooks/use_api';
import { StepDetailsTimeField } from './step_details_time_field';
import {
  getPivotQuery,
  getPreviewTransformRequestBody,
  isTransformIdValid,
} from '../../../../common';
import { EsIndexName, IndexPatternTitle } from './common';
import {
  continuousModeDelayValidator,
  transformFrequencyValidator,
  transformSettingsMaxPageSearchSizeValidator,
} from '../../../../common/validators';
import { StepDefineExposedState } from '../step_define/common';
import { dictionaryToArray } from '../../../../../../common/types/common';

export interface StepDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  destinationIndex: EsIndexName;
  isContinuousModeEnabled: boolean;
  touched: boolean;
  transformId: TransformId;
  transformDescription: string;
  transformFrequency: string;
  transformSettingsMaxPageSearchSize: number;
  transformSettingsDocsPerSecond?: number;
  valid: boolean;
  indexPatternTimeField?: string | undefined;
}

const defaultContinuousModeDelay = '60s';
const defaultTransformFrequency = '1m';
const defaultTransformSettingsMaxPageSearchSize = 500;

export function getDefaultStepDetailsState(): StepDetailsExposedState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: defaultContinuousModeDelay,
    createIndexPattern: true,
    isContinuousModeEnabled: false,
    transformId: '',
    transformDescription: '',
    transformFrequency: defaultTransformFrequency,
    transformSettingsMaxPageSearchSize: defaultTransformSettingsMaxPageSearchSize,
    destinationIndex: '',
    touched: false,
    valid: false,
    indexPatternTimeField: undefined,
  };
}

export function applyTransformConfigToDetailsState(
  state: StepDetailsExposedState,
  transformConfig?: TransformPivotConfig
): StepDetailsExposedState {
  // apply the transform configuration to wizard DETAILS state
  if (transformConfig !== undefined) {
    const time = transformConfig.sync?.time;
    if (time !== undefined) {
      state.continuousModeDateField = time.field;
      state.continuousModeDelay = time?.delay ?? defaultContinuousModeDelay;
      state.isContinuousModeEnabled = true;
    }
    if (transformConfig.description !== undefined) {
      state.transformDescription = transformConfig.description;
    }
    if (transformConfig.frequency !== undefined) {
      state.transformFrequency = transformConfig.frequency;
    }
    if (transformConfig.settings) {
      if (typeof transformConfig.settings?.max_page_search_size === 'number') {
        state.transformSettingsMaxPageSearchSize = transformConfig.settings.max_page_search_size;
      }
      if (typeof transformConfig.settings?.docs_per_second === 'number') {
        state.transformSettingsDocsPerSecond = transformConfig.settings.docs_per_second;
      }
    }
  }
  return state;
}

interface Props {
  overrides?: StepDetailsExposedState;
  onChange(s: StepDetailsExposedState): void;
  searchItems: SearchItems;
  stepDefineState: StepDefineExposedState;
}

export const StepDetailsForm: FC<Props> = React.memo(
  ({ overrides = {}, onChange, searchItems, stepDefineState }) => {
    const deps = useAppDependencies();
    const toastNotifications = useToastNotifications();
    const { esIndicesCreateIndex } = useDocumentationLinks();

    const defaults = { ...getDefaultStepDetailsState(), ...overrides };

    const [transformId, setTransformId] = useState<TransformId>(defaults.transformId);
    const [transformDescription, setTransformDescription] = useState<string>(
      defaults.transformDescription
    );
    const [destinationIndex, setDestinationIndex] = useState<EsIndexName>(
      defaults.destinationIndex
    );
    const [transformIds, setTransformIds] = useState<TransformId[]>([]);
    const [indexNames, setIndexNames] = useState<EsIndexName[]>([]);

    // Index pattern state
    const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternTitle[]>([]);
    const [createIndexPattern, setCreateIndexPattern] = useState(defaults.createIndexPattern);
    const [indexPatternAvailableTimeFields, setIndexPatternAvailableTimeFields] = useState<
      string[]
    >([]);
    const [indexPatternTimeField, setIndexPatternTimeField] = useState<string | undefined>();

    const onTimeFieldChanged = React.useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        // If the value is an empty string, it's not a valid selection
        if (value === '') {
          return;
        }
        // Find the time field based on the selected value
        // this is to account for undefined when user chooses not to use a date field
        const timeField = indexPatternAvailableTimeFields.find((col) => col === value);

        setIndexPatternTimeField(timeField);
      },
      [setIndexPatternTimeField, indexPatternAvailableTimeFields]
    );

    // Continuous mode state
    const [isContinuousModeEnabled, setContinuousModeEnabled] = useState(
      defaults.isContinuousModeEnabled
    );

    const api = useApi();

    // fetch existing transform IDs and indices once for form validation
    useEffect(() => {
      // use an IIFE to avoid returning a Promise to useEffect.
      (async function () {
        const { searchQuery, groupByList, aggList } = stepDefineState;
        const pivotAggsArr = dictionaryToArray(aggList);
        const pivotGroupByArr = dictionaryToArray(groupByList);
        const pivotQuery = getPivotQuery(searchQuery);
        const previewRequest = getPreviewTransformRequestBody(
          searchItems.indexPattern.title,
          pivotQuery,
          pivotGroupByArr,
          pivotAggsArr
        );

        const transformPreview = await api.getTransformsPreview(previewRequest);

        if (isPostTransformsPreviewResponseSchema(transformPreview)) {
          const properties = transformPreview.generated_dest_index.mappings.properties;
          const timeFields: string[] = Object.keys(properties).filter(
            (col) => properties[col].type === 'date'
          );

          setIndexPatternAvailableTimeFields(timeFields);
          setIndexPatternTimeField(timeFields[0]);
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformPreview', {
              defaultMessage: 'An error occurred fetching the transform preview',
            }),
            text: toMountPoint(
              <ToastNotificationText
                overlays={deps.overlays}
                text={getErrorMessage(transformPreview)}
              />
            ),
          });
        }

        const resp = await api.getTransforms();

        if (isHttpFetchError(resp)) {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformList', {
              defaultMessage: 'An error occurred getting the existing transform IDs:',
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(resp)} />
            ),
          });
        } else {
          setTransformIds(resp.transforms.map((transform: TransformPivotConfig) => transform.id));
        }

        const indices = await api.getEsIndices();

        if (isEsIndices(indices)) {
          setIndexNames(indices.map((index) => index.name));
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIndexNames', {
              defaultMessage: 'An error occurred getting the existing index names:',
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(indices)} />
            ),
          });
        }

        try {
          setIndexPatternTitles(await deps.data.indexPatterns.getTitles());
        } catch (e) {
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.transform.stepDetailsForm.errorGettingIndexPatternTitles',
              {
                defaultMessage: 'An error occurred getting the existing index pattern titles:',
              }
            ),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(e)} />
            ),
          });
        }
      })();
      // run once
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dateFieldNames = searchItems.indexPattern.fields
      .filter((f) => f.type === KBN_FIELD_TYPES.DATE)
      .map((f) => f.name)
      .sort();
    const isContinuousModeAvailable = dateFieldNames.length > 0;
    const [continuousModeDateField, setContinuousModeDateField] = useState(
      isContinuousModeAvailable ? dateFieldNames[0] : ''
    );
    const [continuousModeDelay, setContinuousModeDelay] = useState(defaults.continuousModeDelay);
    const isContinuousModeDelayValid = continuousModeDelayValidator(continuousModeDelay);

    const transformIdExists = transformIds.some((id) => transformId === id);
    const transformIdEmpty = transformId === '';
    const transformIdValid = isTransformIdValid(transformId);

    const indexNameExists = indexNames.some((name) => destinationIndex === name);
    const indexNameEmpty = destinationIndex === '';
    const indexNameValid = isValidIndexName(destinationIndex);
    const indexPatternTitleExists = indexPatternTitles.some((name) => destinationIndex === name);

    const [transformFrequency, setTransformFrequency] = useState(defaults.transformFrequency);
    const isTransformFrequencyValid = transformFrequencyValidator(transformFrequency);

    const [transformSettingsMaxPageSearchSize, setTransformSettingsMaxPageSearchSize] = useState(
      defaults.transformSettingsMaxPageSearchSize
    );
    const [transformSettingsDocsPerSecond] = useState(defaults.transformSettingsDocsPerSecond);

    const isTransformSettingsMaxPageSearchSizeValid = transformSettingsMaxPageSearchSizeValidator(
      transformSettingsMaxPageSearchSize
    );

    const valid =
      !transformIdEmpty &&
      transformIdValid &&
      !transformIdExists &&
      isTransformFrequencyValid &&
      isTransformSettingsMaxPageSearchSizeValid &&
      !indexNameEmpty &&
      indexNameValid &&
      (!indexPatternTitleExists || !createIndexPattern) &&
      (!isContinuousModeAvailable || (isContinuousModeAvailable && isContinuousModeDelayValid));

    // expose state to wizard
    useEffect(() => {
      onChange({
        continuousModeDateField,
        continuousModeDelay,
        createIndexPattern,
        isContinuousModeEnabled,
        transformId,
        transformDescription,
        transformFrequency,
        transformSettingsMaxPageSearchSize,
        transformSettingsDocsPerSecond,
        destinationIndex,
        touched: true,
        valid,
        indexPatternTimeField,
      });
      // custom comparison
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [
      continuousModeDateField,
      continuousModeDelay,
      createIndexPattern,
      isContinuousModeEnabled,
      transformId,
      transformDescription,
      transformFrequency,
      transformSettingsMaxPageSearchSize,
      destinationIndex,
      valid,
      indexPatternTimeField,
      /* eslint-enable react-hooks/exhaustive-deps */
    ]);

    return (
      <div data-test-subj="transformStepDetailsForm">
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.transformIdLabel', {
              defaultMessage: 'Transform ID',
            })}
            isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
            error={[
              ...(!transformIdEmpty && !transformIdValid
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.transformIdInvalidError', {
                      defaultMessage:
                        'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                    }),
                  ]
                : []),
              ...(transformIdExists
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.transformIdExistsError', {
                      defaultMessage: 'A transform with this ID already exists.',
                    }),
                  ]
                : []),
            ]}
          >
            <EuiFieldText
              value={transformId}
              onChange={(e) => setTransformId(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.transformIdInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique transform ID.',
                }
              )}
              isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
              data-test-subj="transformIdInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.transformDescriptionLabel', {
              defaultMessage: 'Transform description',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.transform.stepDetailsForm.transformDescriptionPlaceholderText',
                { defaultMessage: 'Description (optional)' }
              )}
              value={transformDescription}
              onChange={(e) => setTransformDescription(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.transformDescriptionInputAriaLabel',
                {
                  defaultMessage: 'Choose an optional transform description.',
                }
              )}
              data-test-subj="transformDescriptionInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.destinationIndexLabel', {
              defaultMessage: 'Destination index',
            })}
            isInvalid={!indexNameEmpty && !indexNameValid}
            helpText={
              indexNameExists &&
              i18n.translate('xpack.transform.stepDetailsForm.destinationIndexHelpText', {
                defaultMessage:
                  'An index with this name already exists. Be aware that running this transform will modify this destination index.',
              })
            }
            error={
              !indexNameEmpty &&
              !indexNameValid && [
                <Fragment>
                  {i18n.translate('xpack.transform.stepDetailsForm.destinationIndexInvalidError', {
                    defaultMessage: 'Invalid destination index name.',
                  })}
                  <br />
                  <EuiLink href={esIndicesCreateIndex} target="_blank">
                    {i18n.translate(
                      'xpack.transform.stepDetailsForm.destinationIndexInvalidErrorLink',
                      {
                        defaultMessage: 'Learn more about index name limitations.',
                      }
                    )}
                  </EuiLink>
                </Fragment>,
              ]
            }
          >
            <EuiFieldText
              value={destinationIndex}
              onChange={(e) => setDestinationIndex(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.destinationIndexInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique destination index name.',
                }
              )}
              isInvalid={!indexNameEmpty && !indexNameValid}
              data-test-subj="transformDestinationIndexInput"
            />
          </EuiFormRow>

          <EuiFormRow
            isInvalid={createIndexPattern && indexPatternTitleExists}
            error={
              createIndexPattern &&
              indexPatternTitleExists && [
                i18n.translate('xpack.transform.stepDetailsForm.indexPatternTitleError', {
                  defaultMessage: 'An index pattern with this title already exists.',
                }),
              ]
            }
          >
            <EuiSwitch
              name="transformCreateIndexPattern"
              label={i18n.translate('xpack.transform.stepCreateForm.createIndexPatternLabel', {
                defaultMessage: 'Create index pattern',
              })}
              checked={createIndexPattern === true}
              onChange={() => setCreateIndexPattern(!createIndexPattern)}
              data-test-subj="transformCreateIndexPatternSwitch"
            />
          </EuiFormRow>
          {createIndexPattern &&
            !indexPatternTitleExists &&
            indexPatternAvailableTimeFields.length > 0 && (
              <StepDetailsTimeField
                indexPatternAvailableTimeFields={indexPatternAvailableTimeFields}
                indexPatternTimeField={indexPatternTimeField}
                onTimeFieldChanged={onTimeFieldChanged}
              />
            )}
          <EuiFormRow
            helpText={
              isContinuousModeAvailable === false
                ? i18n.translate('xpack.transform.stepDetailsForm.continuousModeError', {
                    defaultMessage:
                      'Continuous mode is not available for indices without date fields.',
                  })
                : ''
            }
          >
            <EuiSwitch
              name="transformContinuousMode"
              label={i18n.translate('xpack.transform.stepCreateForm.continuousModeLabel', {
                defaultMessage: 'Continuous mode',
              })}
              checked={isContinuousModeEnabled === true}
              onChange={() => setContinuousModeEnabled(!isContinuousModeEnabled)}
              disabled={isContinuousModeAvailable === false}
              data-test-subj="transformContinuousModeSwitch"
            />
          </EuiFormRow>
          {isContinuousModeEnabled && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDateFieldLabel',
                  {
                    defaultMessage: 'Date field',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDateFieldHelpText',
                  {
                    defaultMessage:
                      'Select the date field that can be used to identify new documents.',
                  }
                )}
              >
                <EuiSelect
                  options={dateFieldNames.map((text: string) => ({ text }))}
                  value={continuousModeDateField}
                  onChange={(e) => setContinuousModeDateField(e.target.value)}
                  data-test-subj="transformContinuousDateFieldSelect"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayLabel', {
                  defaultMessage: 'Delay',
                })}
                isInvalid={!isContinuousModeDelayValid}
                error={
                  !isContinuousModeDelayValid && [
                    i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayError', {
                      defaultMessage: 'Invalid delay format',
                    }),
                  ]
                }
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDelayHelpText',
                  {
                    defaultMessage: 'Time delay between current time and latest input data time.',
                  }
                )}
              >
                <EuiFieldText
                  placeholder="delay"
                  value={continuousModeDelay}
                  onChange={(e) => setContinuousModeDelay(e.target.value)}
                  aria-label={i18n.translate(
                    'xpack.transform.stepDetailsForm.continuousModeAriaLabel',
                    {
                      defaultMessage: 'Choose a delay.',
                    }
                  )}
                  isInvalid={!isContinuousModeDelayValid}
                  data-test-subj="transformContinuousDelayInput"
                />
              </EuiFormRow>
            </Fragment>
          )}

          <EuiSpacer size="l" />

          <EuiAccordion
            data-test-subj="transformWizardAccordionAdvancedSettings"
            id="transformWizardAccordionAdvancedSettings"
            buttonContent={i18n.translate(
              'xpack.transform.stepDetailsForm.advancedSettingsAccordionButtonContent',
              {
                defaultMessage: 'Advanced settings',
              }
            )}
            paddingSize="s"
          >
            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDetailsForm.frequencyLabel', {
                defaultMessage: 'Frequency',
              })}
              isInvalid={!isTransformFrequencyValid}
              error={
                !isTransformFrequencyValid && [
                  i18n.translate('xpack.transform.stepDetailsForm.frequencyError', {
                    defaultMessage: 'Invalid frequency format',
                  }),
                ]
              }
              helpText={i18n.translate('xpack.transform.stepDetailsForm.frequencyHelpText', {
                defaultMessage:
                  'The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.',
              })}
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.transform.stepDetailsForm.editFlyoutFormFrequencyPlaceholderText',
                  {
                    defaultMessage: 'Default: {defaultValue}',
                    values: { defaultValue: '1m' },
                  }
                )}
                value={transformFrequency}
                onChange={(e) => setTransformFrequency(e.target.value)}
                aria-label={i18n.translate('xpack.transform.stepDetailsForm.frequencyAriaLabel', {
                  defaultMessage: 'Choose a frequency.',
                })}
                isInvalid={!isTransformFrequencyValid}
                data-test-subj="transformFrequencyInput"
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDetailsForm.maxPageSearchSizeLabel', {
                defaultMessage: 'Maximum page search size',
              })}
              isInvalid={!isTransformSettingsMaxPageSearchSizeValid}
              error={
                !isTransformSettingsMaxPageSearchSizeValid && [
                  i18n.translate('xpack.transform.stepDetailsForm.maxPageSearchSizeError', {
                    defaultMessage:
                      'max_page_search_size needs to be a number between 10 and 10000.',
                  }),
                ]
              }
              helpText={i18n.translate(
                'xpack.transform.stepDetailsForm.maxPageSearchSizeHelpText',
                {
                  defaultMessage:
                    'Defines the initial page size to use for the composite aggregation for each checkpoint.',
                }
              )}
            >
              <EuiFieldText
                placeholder={i18n.translate(
                  'xpack.transform.stepDetailsForm.editFlyoutFormMaxPageSearchSizePlaceholderText',
                  {
                    defaultMessage: 'Default: {defaultValue}',
                    values: { defaultValue: 500 },
                  }
                )}
                value={transformSettingsMaxPageSearchSize.toString()}
                onChange={(e) =>
                  setTransformSettingsMaxPageSearchSize(parseInt(e.target.value, 10))
                }
                aria-label={i18n.translate(
                  'xpack.transform.stepDetailsForm.maxPageSearchSizeAriaLabel',
                  {
                    defaultMessage: 'Choose a maximum page search size.',
                  }
                )}
                isInvalid={!isTransformFrequencyValid}
                data-test-subj="transformMaxPageSearchSizeInput"
              />
            </EuiFormRow>
          </EuiAccordion>
        </EuiForm>
      </div>
    );
  }
);
