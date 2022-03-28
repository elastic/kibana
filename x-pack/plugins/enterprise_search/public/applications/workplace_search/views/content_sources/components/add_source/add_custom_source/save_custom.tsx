/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  EuiPanel,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButtonTo, EuiLinkTo } from '../../../../../../shared/react_router_helpers';
import { AppLogic } from '../../../../../app_logic';
import { SOURCES_PATH, getSourcesPath } from '../../../../../routes';

import { CustomSourceDeployment } from '../../custom_source_deployment';

import { AddSourceHeader } from '../add_source_header';
import { SAVE_CUSTOM_BODY1 as READY_TO_ACCEPT_REQUESTS_LABEL } from '../constants';

import { AddCustomSourceLogic } from './add_custom_source_logic';

export const SaveCustom: React.FC = () => {
  const { newCustomSource, sourceData } = useValues(AddCustomSourceLogic);
  const { isOrganization } = useValues(AppLogic);
  const { serviceType, name, categories = [] } = sourceData;

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer size="xxl" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel paddingSize="l" hasShadow={false} color="subdued">
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              style={{ marginTop: 'auto', marginBottom: 'auto' }}
            >
              <EuiFlexItem>
                <EuiIcon type="checkInCircleFilled" color="success" size="xxl" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="l">
                  <EuiTextAlign textAlign="center">
                    <h2>
                      {i18n.translate(
                        'xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.heading',
                        {
                          defaultMessage: '{name} Created',
                          values: { name: newCustomSource.name },
                        }
                      )}
                    </h2>
                  </EuiTextAlign>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText grow={false}>
                  <EuiTextAlign textAlign="center">{READY_TO_ACCEPT_REQUESTS_LABEL}</EuiTextAlign>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonTo
                  size="m"
                  color="primary"
                  fill
                  to={getSourcesPath(SOURCES_PATH, isOrganization)}
                >
                  <FormattedMessage
                    id="xpack.enterpriseSearch.workplaceSearch.contentSource.saveCustom.configureNewSourceButtonLabel"
                    defaultMessage="Configure a new content source"
                  />
                </EuiButtonTo>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <CustomSourceDeployment source={newCustomSource} sourceData={sourceData} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {serviceType !== 'custom' && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiCallOut
                data-test-subj="FeedbackCallout"
                heading="h3"
                size="s"
                title={
                  <EuiLinkTo target="_blank" to={'https://www.elastic.co/kibana/feedback'}>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.sources.feedbackLinkLabel"
                      defaultMessage="Have feedback about deploying a {name} connector? Let us know."
                      values={{ name }}
                    />
                  </EuiLinkTo>
                }
                iconType="email"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
