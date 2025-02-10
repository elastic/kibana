/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiPanel,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiCard,
  EuiIcon,
  EuiListGroup,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import {
  getIndexManagementHref,
  getStorageExplorerFeedbackHref,
} from '../get_storage_explorer_links';

export function TipsAndResources() {
  const router = useApmRouter();
  const { core } = useApmPluginContext();
  const { docLinks } = core;

  const {
    query: { rangeFrom, rangeTo, environment, kuery, comparisonEnabled },
  } = useApmParams('/storage-explorer');

  const cards = [
    {
      icon: 'beaker',
      title: i18n.translate('xpack.apm.storageExplorer.resources.errorMessages.title', {
        defaultMessage: 'Reduce transactions',
      }),
      description: i18n.translate('xpack.apm.storageExplorer.resources.errorMessages.description', {
        defaultMessage:
          'Configure a more aggressive transaction sampling policy. Transaction sampling lowers the amount of data ingested without negatively impacting the usefulness of that data.',
      }),
      href: docLinks.links.apm.transactionSampling,
    },
    {
      icon: 'visLine',
      title: i18n.translate('xpack.apm.storageExplorer.resources.compressedSpans.title', {
        defaultMessage: 'Reduce spans',
      }),
      description: i18n.translate(
        'xpack.apm.storageExplorer.resources.compressedSpans.description',
        {
          defaultMessage:
            'Enable span compression. Span compression saves on data and transfer costs by compressing multiple similar spans into a single span.',
        }
      ),
      href: docLinks.links.apm.spanCompression,
    },
    {
      icon: 'indexEdit',
      title: i18n.translate('xpack.apm.storageExplorer.resources.samplingRate.title', {
        defaultMessage: 'Manage the index lifecycle',
      }),
      description: i18n.translate('xpack.apm.storageExplorer.resources.samplingRate.description', {
        defaultMessage:
          'Customize your index lifecycle policies. Index lifecycle policies allow you to manage indices according to your performance, resiliency, and retention requirements.',
      }),
      href: docLinks.links.apm.indexLifecycleManagement,
    },
  ];

  const resourcesListItems = [
    {
      label: i18n.translate('xpack.apm.storageExplorer.resources.indexManagement', {
        defaultMessage: 'Index management',
      }),
      href: getIndexManagementHref(core),
      iconType: 'indexEdit',
    },
    {
      label: i18n.translate('xpack.apm.storageExplorer.resources.serviceInventory', {
        defaultMessage: 'Service Inventory',
      }),
      href: router.link('/services', {
        query: {
          rangeFrom,
          rangeTo,
          environment,
          comparisonEnabled,
          kuery,
          serviceGroup: '',
        },
      }),
      iconType: 'tableDensityExpanded',
    },
    {
      label: i18n.translate('xpack.apm.storageExplorer.resources.documentation', {
        defaultMessage: 'Documentation',
      }),
      href: docLinks.links.apm.storageExplorer,
      target: '_blank',
      iconType: 'documentation',
    },
    {
      label: i18n.translate('xpack.apm.storageExplorer.resources.sendFeedback', {
        defaultMessage: 'Give feedback',
      }),
      href: getStorageExplorerFeedbackHref(),
      target: '_blank',
      iconType: 'editorComment',
    },
  ];

  return (
    <EuiPanel hasBorder={true} hasShadow={false}>
      <EuiAccordion
        id="tipsAndResourcesAccordion"
        buttonContent={
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.storageExplorer.resources.accordionTitle', {
                defaultMessage: 'Tips and tricks',
              })}
            </h2>
          </EuiTitle>
        }
        initialIsOpen
        paddingSize="m"
      >
        <EuiFlexGroup justifyContent="spaceAround">
          {cards.map(({ icon, title, description, href }) => (
            <EuiFlexItem key={icon}>
              <EuiCard
                icon={<EuiIcon size="xl" type={icon} />}
                title={title}
                description={description}
                footer={
                  <EuiButton
                    data-test-subj="apmTipsAndResourcesLearnMoreButton"
                    href={href}
                    target="_blank"
                  >
                    {i18n.translate('xpack.apm.storageExplorer.resources.learnMoreButton', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiButton>
                }
              />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.apm.storageExplorer.resources.title', {
                  defaultMessage: 'Resources',
                })}
              </h3>
            </EuiTitle>
            <EuiListGroup listItems={resourcesListItems} color="primary" size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
}
