/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCard,
  EuiCopy,
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

import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';

import { DISCOVER_APP_LOCATOR } from '../../../../../../../../../src/plugins/discover/public';

import type { PutTransformsResponseSchema } from '../../../../../../common/api_schemas/transforms';
import {
  isGetTransformsStatsResponseSchema,
  isPutTransformsResponseSchema,
  isStartTransformsResponseSchema,
} from '../../../../../../common/api_schemas/type_guards';
import { PROGRESS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { getTransformProgress } from '../../../../common';
import { useApi } from '../../../../hooks/use_api';
import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { RedirectToTransformManagement } from '../../../../common/navigation';
import { ToastNotificationText } from '../../../../components';
import { DuplicateDataViewError } from '../../../../../../../../../src/plugins/data/public';
import {
  PutTransformsLatestRequestSchema,
  PutTransformsPivotRequestSchema,
} from '../../../../../../common/api_schemas/transforms';
import type { RuntimeField } from '../../../../../../../../../src/plugins/data/common';
import { isPopulatedObject } from '../../../../../../common/shared_imports';
import { isContinuousTransform, isLatestTransform } from '../../../../../../common/types/transform';
import { TransformAlertFlyout } from '../../../../../alerting/transform_alerting_flyout';

export interface StepDetailsExposedState {
  created: boolean;
  started: boolean;
  dataViewId: string | undefined;
}

export function getDefaultStepCreateState(): StepDetailsExposedState {
  return {
    created: false,
    started: false,
    dataViewId: undefined,
  };
}

export interface StepCreateFormProps {
  createDataView: boolean;
  transformId: string;
  transformConfig: PutTransformsPivotRequestSchema | PutTransformsLatestRequestSchema;
  overrides: StepDetailsExposedState;
  timeFieldName?: string | undefined;
  onChange(s: StepDetailsExposedState): void;
}

export const StepCreateForm: FC<StepCreateFormProps> = React.memo(
  ({ createDataView, transformConfig, transformId, onChange, overrides, timeFieldName }) => {
    const defaults = { ...getDefaultStepCreateState(), ...overrides };

    const [redirectToTransformManagement, setRedirectToTransformManagement] = useState(false);

    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(defaults.created);
    const [started, setStarted] = useState(defaults.started);
    const [alertFlyoutVisible, setAlertFlyoutVisible] = useState(false);
    const [dataViewId, setDataViewId] = useState(defaults.dataViewId);
    const [progressPercentComplete, setProgressPercentComplete] = useState<undefined | number>(
      undefined
    );
    const [discoverLink, setDiscoverLink] = useState<string>();

    const deps = useAppDependencies();
    const { share } = deps;
    const dataViews = deps.data.dataViews;
    const toastNotifications = useToastNotifications();
    const isDiscoverAvailable = deps.application.capabilities.discover?.show ?? false;

    useEffect(() => {
      let unmounted = false;

      onChange({ created, started, dataViewId });

      const getDiscoverUrl = async (): Promise<void> => {
        const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);

        if (!locator) return;

        const discoverUrl = await locator.getUrl({
          indexPatternId: dataViewId,
        });

        if (!unmounted) {
          setDiscoverLink(discoverUrl);
        }
      };

      if (started === true && dataViewId !== undefined && isDiscoverAvailable) {
        getDiscoverUrl();
      }

      return () => {
        unmounted = true;
      };
      // custom comparison
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [created, started, dataViewId]);

    const { overlays, theme } = useAppDependencies();
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
              overlays={overlays}
              theme={theme}
              text={getErrorMessage(isPutTransformsResponseSchema(resp) ? respErrors : resp)}
            />,
            { theme$: theme.theme$ }
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

      if (createDataView) {
        createKibanaDataView();
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
          <ToastNotificationText
            overlays={overlays}
            theme={theme}
            text={getErrorMessage(errorMessage)}
          />,
          { theme$: theme.theme$ }
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

    const createKibanaDataView = async () => {
      setLoading(true);
      const dataViewName = transformConfig.dest.index;
      const runtimeMappings = transformConfig.source.runtime_mappings as Record<
        string,
        RuntimeField
      >;

      try {
        const newDataView = await dataViews.createAndSave(
          {
            title: dataViewName,
            timeFieldName,
            ...(isPopulatedObject(runtimeMappings) && isLatestTransform(transformConfig)
              ? { runtimeFieldMap: runtimeMappings }
              : {}),
          },
          false,
          true
        );

        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.stepCreateForm.createDataViewSuccessMessage', {
            defaultMessage: 'Kibana data view {dataViewName} created successfully.',
            values: { dataViewName },
          })
        );

        setDataViewId(newDataView.id);
        setLoading(false);
        return true;
      } catch (e) {
        if (e instanceof DuplicateDataViewError) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.stepCreateForm.duplicateDataViewErrorMessage', {
              defaultMessage:
                'An error occurred creating the Kibana data view {dataViewName}: The data view already exists.',
              values: { dataViewName },
            })
          );
        } else {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepCreateForm.createDataViewErrorMessage', {
              defaultMessage: 'An error occurred creating the Kibana data view {dataViewName}:',
              values: { dataViewName },
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={overlays} theme={theme} text={getErrorMessage(e)} />,
              { theme$: theme.theme$ }
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
                <ToastNotificationText
                  overlays={overlays}
                  theme={theme}
                  text={getErrorMessage(stats)}
                />,
                { theme$: theme.theme$ }
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
          {isContinuousTransform(transformConfig) && created ? (
            <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
              <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
                <EuiButton
                  fill
                  isDisabled={loading}
                  onClick={setAlertFlyoutVisible.bind(null, true)}
                  data-test-subj="transformWizardCreateAlertButton"
                >
                  <FormattedMessage
                    id="xpack.transform.stepCreateForm.createAlertRuleButton"
                    defaultMessage="Create alert rule"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {i18n.translate('xpack.transform.stepCreateForm.createAlertRuleDescription', {
                    defaultMessage:
                      'Opens a wizard to create an alert rule for monitoring transform health.',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
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
                    'Creates the transform without starting it. You will be able to start the transform later by returning to the transforms list.',
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
              <EuiFlexGroup gutterSize="l">
                <EuiFlexItem style={PANEL_ITEM_STYLE} grow={false}>
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
                {started === true && createDataView === true && dataViewId === undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE} grow={false}>
                    <EuiPanel style={{ position: 'relative' }}>
                      <EuiProgress size="xs" color="primary" position="absolute" />
                      <EuiText color="subdued" size="s">
                        <p>
                          {i18n.translate(
                            'xpack.transform.stepCreateForm.creatingDataViewMessage',
                            {
                              defaultMessage: 'Creating Kibana data view ...',
                            }
                          )}
                        </p>
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                )}
                {isDiscoverAvailable && discoverLink !== undefined && (
                  <EuiFlexItem style={PANEL_ITEM_STYLE} grow={false}>
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
                      href={discoverLink}
                      data-test-subj="transformWizardCardDiscover"
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </Fragment>
          )}
        </EuiForm>
        {alertFlyoutVisible ? (
          <TransformAlertFlyout
            ruleParams={{ includeTransforms: [transformId] }}
            onCloseFlyout={setAlertFlyoutVisible.bind(null, false)}
          />
        ) : null}
      </div>
    );
  }
);
