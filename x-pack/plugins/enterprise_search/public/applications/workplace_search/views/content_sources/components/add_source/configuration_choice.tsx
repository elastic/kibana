/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import { getAddPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import { AddSourceHeader } from './add_source_header';

interface ConfigurationIntroProps {
  sourceData: SourceDataItem;
  goToInternalStep?: () => void;
}

export const ConfigurationChoice: React.FC<ConfigurationIntroProps> = ({
  sourceData: {
    name,
    serviceType,
    externalConnectorAvailable,
    internalConnectorAvailable,
    customConnectorAvailable,
  },
  goToInternalStep,
}) => {
  const { isOrganization } = useValues(AppLogic);
  const goToInternal = goToInternalStep
    ? goToInternalStep
    : () =>
        KibanaLogic.values.navigateToUrl(
          `${getSourcesPath(
            `${getSourcesPath(getAddPath(serviceType), isOrganization)}/internal`,
            isOrganization
          )}/`
        );
  const goToExternal = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(
        `${getSourcesPath(getAddPath(serviceType), isOrganization)}/external`,
        isOrganization
      )}/`
    );
  const goToCustom = () =>
    KibanaLogic.values.navigateToUrl(
      `${getSourcesPath(
        `${getSourcesPath(getAddPath(serviceType), isOrganization)}/custom`,
        isOrganization
      )}/`
    );

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={[]} />
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="flexStart"
        direction="row"
        responsive={false}
      >
        {internalConnectorAvailable && (
          <EuiFlexItem grow>
            <EuiPanel color="plain" hasShadow={false} hasBorder>
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                direction="column"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem>
                  <EuiText size="s">
                    <h4>{name}</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.title',
                        {
                          defaultMessage: 'Default connector',
                        }
                      )}
                    </h3>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.description',
                      {
                        defaultMessage: 'Use our out-of-the-box connector to get started quickly.',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton color="primary" fill onClick={goToInternal}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.internal.button',
                      {
                        defaultMessage: 'Connect',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}
        {externalConnectorAvailable && (
          <EuiFlexItem grow>
            <EuiPanel color="plain" hasShadow={false} hasBorder>
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                direction="column"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem>
                  <EuiText size="s">
                    <h4>{name}</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.title',
                        {
                          defaultMessage: 'Custom connector',
                        }
                      )}
                    </h3>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.description',
                      {
                        defaultMessage:
                          'Set up a custom connector for more configurability and control.',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiButton color="primary" fill onClick={goToExternal}>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.external.button',
                        {
                          defaultMessage: 'Instructions',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}
        {customConnectorAvailable && (
          <EuiFlexItem grow>
            <EuiPanel>
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                direction="column"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem>
                  <EuiText size="s">
                    <h4>{name}</h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.custom.title',
                        {
                          defaultMessage: 'Custom connector',
                        }
                      )}
                    </h3>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.custom.description',
                      {
                        defaultMessage:
                          'Set up a custom connector for more configurability and control.',
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiButton color="primary" fill onClick={goToCustom}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.contentSource.configExternalChoice.custom.button',
                      {
                        defaultMessage: 'Instructions',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
