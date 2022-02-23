/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import { getAddPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import { AddSourceHeader } from './add_source_header';
import { AddSourceLogic } from './add_source_logic';

interface ConfigurationIntroProps {
  sourceData: SourceDataItem;
}

export const ConfigurationChoice: React.FC<ConfigurationIntroProps> = ({
  sourceData: {
    serviceType,
    externalConnectorAvailable,
    internalConnectorAvailable,
    customConnectorAvailable,
  },
}) => {
  const { isOrganization } = useValues(AppLogic);
  const { sourceConfigData } = useValues(AddSourceLogic);
  const { name, categories } = sourceConfigData;
  const goToInternal = () =>
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
      <AddSourceHeader name={name} serviceType={serviceType} categories={[]} />;
      <EuiSpacer />
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="flexStart"
        direction="row"
        responsive={false}
      >
        {internalConnectorAvailable && (
          <EuiFlexItem grow>
            <EuiSplitPanel.Outer color="plain" hasShadow={false} hasBorder>
              <EuiSplitPanel.Inner>
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
                          defaultMessage:
                            'Use our out-of-the-box connector to get started quickly.',
                        }
                      )}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner color="subdued" paddingSize="none">
                <EuiFlexGroup justifyContent="center">
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
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        )}
        {externalConnectorAvailable && (
          <EuiFlexItem grow>
            <EuiSplitPanel.Outer color="plain" hasShadow={false} hasBorder>
              <EuiSplitPanel.Inner>
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
                </EuiFlexGroup>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner color="subdued" paddingSize="none">
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
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        )}
        {customConnectorAvailable && (
          <EuiFlexItem grow>
            <EuiSplitPanel.Outer color="plain" hasShadow={false} hasBorder>
              <EuiSplitPanel.Inner>
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
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner color="subdued" paddingSize="none">
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
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
