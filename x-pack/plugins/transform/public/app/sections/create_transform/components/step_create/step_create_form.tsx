/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCard,
  EuiCopy,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';

import type {
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../../../../common/api_schemas/transforms';
import {
  isGetTransformsStatsResponseSchema,
  isPutTransformsResponseSchema,
  isStartTransformsResponseSchema,
} from '../../../../../../common/api_schemas/type_guards';
import { PROGRESS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { getTransformProgress, getDiscoverUrl } from '../../../../common';
import { useApi } from '../../../../hooks/use_api';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { RedirectToTransformManagement } from '../../../../common/navigation';
import { ToastNotificationText } from '../../../../components';
import { DuplicateIndexPatternError } from '../../../../../../../../../src/plugins/data/public';

export interface StepDetailsExposedState {
  created: boolean;
  started: boolean;
  indexPatternId: string | undefined;
}

export function getDefaultStepCreateState(): StepDetailsExposedState {
  return {
    created: false,
    started: false,
    indexPatternId: undefined,
  };
}

export interface StepCreateFormProps {
  createIndexPattern: boolean;
  transformId: string;
  transformConfig: PutTransformsRequestSchema;
  overrides: StepDetailsExposedState;
  timeFieldName?: string | undefined;
  onChange(s: StepDetailsExposedState): void;
}

export const StepCreateForm: FC<StepCreateFormProps> = React.memo(
  ({ createIndexPattern, transformConfig, transformId, onChange, overrides, timeFieldName }) => {
    const defaults = { ...getDefaultStepCreateState(), ...overrides };

    const [redirectToTransformManagement, setRedirectToTransformManagement] = useState(false);

    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(defaults.created);
    const [started, setStarted] = useState(defaults.started);
    const [indexPatternId, setIndexPatternId] = useState(defaults.indexPatternId);
    const [progressPercentComplete, setProgressPercentComplete] = useState<undefined | number>(
      undefined
    );

    const deps = useAppDependencies();
    const indexPatterns = deps.data.indexPatterns;
    const toastNotifications = useToastNotifications();

    useEffect(() => {
      onChange({ created, started, indexPatternId });
      // custom comparison
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [created, started, indexPatternId]);

    const api = useApi();

    async function createTransform() {
      setLoading(true);

      const resp = await api.createTransform(transformId, transformConfig);

      if (!isPutTransformsResponseSchema(resp) || resp.errors.length > 0) {
        let respErrors:
          | PutTransformsResponseSchema['errors']
          | PutTransformsResponseSchema['errors'][number]
          | undefined;

        if (isPutTransformsResponseSchema(resp) && resp.errors.length > 0) {
          respErrors = resp.errors.length === 1 ? resp.errors[0] : resp.errors;
        }

        toastNotifications.addDanger({
          title: i18n.translate('xpack.transform.stepCreateForm.createTransformErrorMessage', {
            defaultMessage: 'An error occurred creating the transform {transformId}:',
            values: { transformId },
          }),
          text: toMountPoint(
            <ToastNotificationText
              overlays={deps.overlays}
              text={getErrorMessage(isPutTransformsResponseSchema(resp) ? respErrors : resp)}
            />
          ),
        });
        setCreated(false);
        setLoading(false);
        return false;
      }

      toastNotifications.addSuccess(
        i18n.translate('xpack.transform.stepCreateForm.createTransformSuccessMessage', {
          defaultMessage: 'Request to create transform {transformId} acknowledged.',
          values: { transformId },
        })
      );
      setCreated(true);
      setLoading(false);

      if (createIndexPattern) {
        createKibanaIndexPattern();
      }

      return true;
    }

    async function startTransform() {
      setLoading(true);

      const resp = await api.startTransforms([{ id: transformId }]);

      if (isStartTransformsResponseSchema(resp) && resp[transformId]?.success === true) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.stepCreateForm.startTransformSuccessMessage', {
            defaultMessage: 'Request to start transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
        setStarted(true);
        setLoading(false);
        return;
      }

      const errorMessage =
        isStartTransformsResponseSchema(resp) && resp[transformId]?.success === false
          ? resp[transformId].error
          : resp;

      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepCreateForm.startTransformErrorMessage', {
          defaultMessage: 'An error occurred starting the transform {transformId}:',
          values: { transformId },
        }),
        text: toMountPoint(
          <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(errorMessage)} />
        ),
      });
      setStarted(false);
      setLoading(false);
    }

    async function createAndStartTransform() {
      const acknowledged = await createTransform();
      if (acknowledged) {
        await startTransform();
      }
    }

    const createKibanaIndexPattern = async () => {
      setLoading(true);
      const indexPatternName = transformConfig.dest.index;

      try {
        const newIndexPattern = await indexPatterns.createAndSave(
          {
            title: indexPatternName,
            timeFieldName,
          },
          false,
          true
        );

        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.stepCreateForm.createIndexPatternSuccessMessage', {
            defaultMessage: 'Kibana index pattern {indexPatternName} created successfully.',
            values: { indexPatternName },
          })
        );

        setIndexPatternId(newIndexPattern.id);
        setLoading(false);
        return true;
      } catch (e) {
        if (e instanceof DuplicateIndexPatternError) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.stepCreateForm.duplicateIndexPatternErrorMessage', {
              defaultMessage:
                'An error occurred creating the Kibana index pattern {indexPatternName}: The index pattern already exists.',
              values: { indexPatternName },
            })
          );
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepCreateForm.createIndexPatternErrorMessage', {
              defaultMessage:
                'An error occurred creating the Kibana index pattern {indexPatternName}:',
              values: { indexPatternName },
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(e)} />
            ),
          });
          setLoading(false);
          return false;
        }
      }
    };

    const isBatchTransform = typeof transformConfig.sync === 'undefined';

    if (
      loading === false &&
      started === true &&
      progressPercentComplete === undefined &&
      isBatchTransform
    ) {
      // wrapping in function so we can keep the interval id in local scope
      function startProgressBar() {
        const interval = setInterval(async () => {
          const stats = await api.getTransformStats(transformId);

          if (
            isGetTransformsStatsResponseSchema(stats) &&
            Array.isArray(stats.transforms) &&
            stats.transforms.length > 0
          ) {
            const percent =
              getTransformProgress({
                id: transformId,
                config: {
                  ...transformConfig,
                  id: transformId,
                },
                stats: stats.transforms[0],
              }) || 0;
            setProgressPercentComplete(percent);
            if (percent >= 100) {
              clearInterval(interval);
            }
          } else {
            toastNotifications.addDanger({
              title: i18n.translate('xpack.transform.stepCreateForm.progressErrorMessage', {
                defaultMessage: 'An error occurred getting the progress percentage:',
              }),
              text: toMountPoint(
                <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(stats)} />
              ),
            });
            clearInterval(interval);
          }
        }, PROGRESS_REFRESH_INTERVAL_MS);
        setProgressPercentComplete(0);
      }

      startProgressBar();
    }

    function getTransformConfigDevConsoleStatement() {
      return `PUT _transform/${transformId}\n${JSON.stringify(transformConfig, null, 2)}\n\n`;
    }

    // TODO move this to SASS
    const FLEX_GROUP_STYLE = { height: '90px', maxWidth: '800px' };
    const FLEX_ITEM_STYLE = { width: '200px' };
    const PANEL_ITEM_STYLE = { width: '300px' };

    if (redirectToTransformManagement) {
      return <RedirectToTransformManagement />;
    }

    return (
      <div data-test-subj="transformStepCreateForm">
        <EuiForm>
          {!created && (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={loading || (created && started)}
                  onClick={createAndStartTransform}
                  data-test-subj="transformWizardCreateAndStartButton"
                >
                  {i18n.translate('xpack.transform.stepCreateForm.createAndStartTransformButton', {
                    defaultMessage: 'Create and start',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate(
                    'xpack.transform.stepCreateForm.createAndStartTransformDescription',
                    {
                      defaultMessage:
                        'Creates and starts the transform. A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the transform.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {created && (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={loading || (created && started)}
                  onClick={startTransform}
                  data-test-subj="transformWizardStartButton"
                >
                  {i18n.translate('xpack.transform.stepCreateForm.startTransformButton', {
                    defaultMessage: 'Start',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.transform.stepCreateForm.startTransformDescription', {
                    defaultMessage:
                      'Starts the transform. A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. After the transform is started, you will be offered options to continue exploring the transform.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton
                isDisabled={loading || created}
                onClick={createTransform}
                data-test-subj="transformWizardCreateButton"
              >
                {i18n.translate('xpack.transform.stepCreateForm.createTransformButton', {
                  defaultMessage: 'Create',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.transform.stepCreateForm.createTransformDescription', {
                  defaultMessage:
                    'Create the transform without starting it. You will be able to start the transform later by returning to the transforms list.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiCopy textToCopy={getTransformConfigDevConsoleStatement()}>
                {(copy: () => void) => (
                  <EuiButton
                    onClick={copy}
                    style={{ width: '100%' }}
                    data-test-subj="transformWizardCopyToClipboardButton"
                  >
                    {i18n.translate(
                      'xpack.transform.stepCreateForm.copyTransformConfigToClipboardButton',
                      {
                        defaultMessage: 'Copy to clipboard',
                      }
                    )}
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.transform.stepCreateForm.copyTransformConfigToClipboardDescription',
                  {
                    defaultMessage:
                      'Copies to the clipboard the Kibana Dev Console command for creating the transform.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {progressPercentComplete !== undefined && isBatchTransform && (
            <Fragment>
              <EuiSpacer size="m" />
              <EuiText size="xs">
                <strong>
                  {i18n.translate('xpack.transform.stepCreateForm.progressTitle', {
                    defaultMessage: 'Progress',
                  })}
                </strong>
              </EuiText>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem style={{ width: '400px' }} grow={false}>
                  <EuiProgress
                    size="l"
                    color="primary"
                    value={progressPercentComplete}
                    max={100}
                    data-test-subj="transformWizardProgressBar"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">{progressPercentComplete}%</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
          {created && (
            <Fragment>
              <EuiHorizontalRule />
              <EuiFlexGrid gutterSize="l">
                <EuiFlexItem style={PANEL_ITEM_STYLE}>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="list" />}
                    title={i18n.translate('xpack.transform.stepCreateForm.transformListCardTitle', {
                      defaultMessage: 'Transforms',
                    })}
                    description={i18n.translate(
                      'xpack.transform.stepCreateForm.transformListCardDescription',
                      {
                        defaultMessage: 'Return to the transform management page.',
                      }
                    )}
                    onClick={() => setRedirectToTransformManagement(true)}
                    data-test-subj="transformWizardCardManagement"
                  />
                </EuiFlexItem>
                {started === true && createIndexPattern === true && indexPatternId === undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE}>
                    <EuiPanel style={{ position: 'relative' }}>
                      <EuiProgress size="xs" color="primary" position="absolute" />
                      <EuiText color="subdued" size="s">
                        <p>
                          {i18n.translate(
                            'xpack.transform.stepCreateForm.creatingIndexPatternMessage',
                            {
                              defaultMessage: 'Creating Kibana index pattern ...',
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                )}
                {started === true && indexPatternId !== undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE}>
                    <EuiCard
                      icon={<EuiIcon size="xxl" type="discoverApp" />}
                      title={i18n.translate('xpack.transform.stepCreateForm.discoverCardTitle', {
                        defaultMessage: 'Discover',
                      })}
                      description={i18n.translate(
                        'xpack.transform.stepCreateForm.discoverCardDescription',
                        {
                          defaultMessage: 'Use Discover to explore the transform.',
                        }
                      )}
                      href={getDiscoverUrl(indexPatternId, deps.http.basePath.get())}
                      data-test-subj="transformWizardCardDiscover"
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGrid>
            </Fragment>
          )}
        </EuiForm>
      </div>
    );
  }
);
