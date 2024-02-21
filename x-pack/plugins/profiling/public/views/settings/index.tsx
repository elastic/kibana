/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { withSuspense } from '@kbn/shared-ux-utility';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
  profilingPervCPUWattArm64,
  profilingAWSCostDiscountRate,
  profilingAzureCostDiscountRate,
  profilingCostPervCPUPerHour,
  profilingShowErrorFrames,
} from '@kbn/observability-plugin/common';
import { useEditableSettings, useUiTracker } from '@kbn/observability-shared-plugin/public';
import { isEmpty } from 'lodash';
import React from 'react';
import { FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { BottomBarActions } from './bottom_bar_actions';

const LazyFieldRow = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-components-field-row')).FieldRow,
}));

const FieldRow = withSuspense(LazyFieldRow);

const co2Settings = [
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
  profilingPervCPUWattArm64,
];
const costSettings = [
  profilingAWSCostDiscountRate,
  profilingAzureCostDiscountRate,
  profilingCostPervCPUPerHour,
];
const miscSettings = [profilingShowErrorFrames];

export function Settings() {
  const trackProfilingEvent = useUiTracker({ app: 'profiling' });
  const {
    start: {
      core: { docLinks, notifications, settings },
    },
  } = useProfilingDependencies();

  const { fields, handleFieldChange, unsavedChanges, saveAll, isSaving, cleanUnsavedChanges } =
    useEditableSettings('profiling', [...co2Settings, ...costSettings, ...miscSettings]);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return fields[key].requiresPageReload;
      });
      await saveAll();
      trackProfilingEvent({ metric: 'general_settings_save' });
      if (reloadPage) {
        window.location.reload();
      }
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.profiling.settings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  return (
    <ProfilingAppPageTemplate hideSearchBar>
      <>
        <EuiTitle>
          <EuiText>
            {i18n.translate('xpack.profiling.settings.title', {
              defaultMessage: 'Advanced Settings',
            })}
          </EuiText>
        </EuiTitle>
        <EuiSpacer />
        {[
          {
            label: i18n.translate('xpack.profiling.settings.co2Section', {
              defaultMessage: 'Custom CO2 settings',
            }),
            description: {
              title: i18n.translate('xpack.profiling.settings.co2.title', {
                defaultMessage:
                  'The Universal Profiling host agent can detect if your machine is running on AWS, Azure, or Google Cloud Platform.',
              }),
              subtitle: (
                <>
                  <FormattedMessage
                    id="xpack.profiling.settings.co2.aws.subtitle"
                    defaultMessage="For machines running on AWS, Universal Profiling applies the appropriate {regionalCarbonIntensityLink} for your instance's AWS region and the current AWS data center {pue}."
                    values={{
                      regionalCarbonIntensityLink: (
                        <EuiLink
                          data-test-subj="profilingSettingsLink"
                          href="https://ela.st/grid-datasheet"
                          target="_blank"
                        >
                          {i18n.translate('xpack.profiling.settings.co2.subtitle.link', {
                            defaultMessage: 'regional carbon intensity',
                          })}
                        </EuiLink>
                      ),
                      pue: (
                        <strong>
                          {i18n.translate('xpack.profiling.settings.co2.subtitle.pue', {
                            defaultMessage: 'PUE',
                          })}
                        </strong>
                      ),
                    }}
                  />
                  <EuiSpacer size="xs" />
                  <FormattedMessage
                    id="xpack.profiling.settings.co2.azure.subtitle"
                    defaultMessage="For machines running on Azure, Universal Profiling applies the appropriate {regionalCarbonIntensityLink} for your instance's Azure region and the current Azure data center {pue}."
                    values={{
                      regionalCarbonIntensityLink: (
                        <EuiLink
                          data-test-subj="profilingSettingsLink"
                          href="https://ela.st/grid-datasheet"
                          target="_blank"
                        >
                          {i18n.translate('xpack.profiling.settings.co2.subtitle.link', {
                            defaultMessage: 'regional carbon intensity',
                          })}
                        </EuiLink>
                      ),
                      pue: (
                        <strong>
                          {i18n.translate('xpack.profiling.settings.co2.subtitle.pue', {
                            defaultMessage: 'PUE',
                          })}
                        </strong>
                      ),
                    }}
                  />
                </>
              ),
              text: i18n.translate('xpack.profiling.settings.co2.text', {
                defaultMessage:
                  'For all other configurations, Universal Profiling uses the following default configurations. You can update these configurations as needed.',
              }),
            },
            settings: co2Settings,
          },
          {
            label: i18n.translate('xpack.profiling.settings.costSection', {
              defaultMessage: 'Custom cost settings',
            }),
            description: {
              title: (
                <FormattedMessage
                  id="xpack.profiling.settings.cost.title"
                  defaultMessage="Universal Profiling uses the cost for AWS EC2 instances and Azure VMs using the {awsPriceList} and {azurePriceList} respectively."
                  values={{
                    awsPriceList: (
                      <EuiLink
                        data-test-subj="profilingSettingsLinkAws"
                        href="https://ela.st/aws-price-list"
                        target="_blank"
                      >
                        {i18n.translate('xpack.profiling.settings.cost.subtitle.link.aws', {
                          defaultMessage: 'AWS price list',
                        })}
                      </EuiLink>
                    ),
                    azurePriceList: (
                      <EuiLink
                        data-test-subj="profilingSettingsLinkAzure"
                        href="https://ela.st/azure-price-list"
                        target="_blank"
                      >
                        {i18n.translate('xpack.profiling.settings.cost.subtitle.link.azure', {
                          defaultMessage: 'Azure price list',
                        })}
                      </EuiLink>
                    ),
                  }}
                />
              ),
            },
            settings: costSettings,
          },
          {
            label: i18n.translate('xpack.profiling.settings.miscSection', {
              defaultMessage: 'Miscellaneous settings',
            }),
            description: {
              title: (
                <FormattedMessage
                  id="xpack.profiling.settings.misc.title"
                  defaultMessage="Universal Profiling miscellaneous settings."
                />
              ),
            },
            settings: miscSettings,
          },
        ].map((item) => (
          <>
            <EuiPanel key={item.label} grow={false} hasShadow={false} hasBorder paddingSize="none">
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiTitle size="s">
                  <EuiText>{item.label}</EuiText>
                </EuiTitle>
              </EuiPanel>
              <EuiPanel hasShadow={false}>
                {item.description ? (
                  <>
                    <EuiFlexGroup gutterSize="xs">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="iInCircle" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFlexGroup direction="column" gutterSize="xs">
                          {item.description.title && (
                            <EuiFlexItem>
                              <EuiText size="s">{item.description.title}</EuiText>
                            </EuiFlexItem>
                          )}
                          {item.description.subtitle && (
                            <EuiFlexItem>
                              <EuiText size="s">{item.description.subtitle}</EuiText>
                            </EuiFlexItem>
                          )}
                          {item.description.text && (
                            <EuiFlexItem>
                              <EuiText size="s">
                                <strong>{item.description.text}</strong>
                              </EuiText>
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="m" />
                  </>
                ) : null}
                {item.settings.map((settingKey) => {
                  const field = fields[settingKey];
                  return (
                    <FieldRowProvider
                      {...{
                        links: docLinks.links.management,
                        showDanger: (message: string) => notifications.toasts.addDanger(message),
                        validateChange: (key: string, value: any) =>
                          settings.client.validateValue(key, value),
                      }}
                    >
                      <FieldRow
                        field={field}
                        isSavingEnabled={true}
                        onFieldChange={handleFieldChange}
                        unsavedChange={unsavedChanges[settingKey]}
                      />
                    </FieldRowProvider>
                  );
                })}
              </EuiPanel>
            </EuiPanel>
            <EuiSpacer />
          </>
        ))}

        {!isEmpty(unsavedChanges) && (
          <BottomBarActions
            isLoading={isSaving}
            onDiscardChanges={cleanUnsavedChanges}
            onSave={handleSave}
            saveLabel={i18n.translate('xpack.profiling.settings.saveButton', {
              defaultMessage: 'Save changes',
            })}
            unsavedChangesCount={Object.keys(unsavedChanges).length}
            areChangesInvalid={hasInvalidChanges}
          />
        )}
      </>
    </ProfilingAppPageTemplate>
  );
}
