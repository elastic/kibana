/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../../shared/doc_links';

import connectionIllustration from '../../../../../assets/connection_illustration.svg';
import { SOURCE_NAME_LABEL } from '../../../constants';

import { AddSourceHeader } from '../add_source_header';
import { CONFIG_CUSTOM_BUTTON, CONFIG_CUSTOM_LINK_TEXT, CONFIG_INTRO_ALT_TEXT } from '../constants';

import { AddCustomSourceLogic } from './add_custom_source_logic';

export const ConfigureCustom: React.FC = () => {
  const { setCustomSourceNameValue, createContentSource } = useActions(AddCustomSourceLogic);
  const { customSourceNameValue, buttonLoading, sourceData } = useValues(AddCustomSourceLogic);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    createContentSource();
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setCustomSourceNameValue(e.target.value);

  const {
    serviceType,
    configuration: { documentationUrl, githubRepository },
    name,
    categories = [],
  } = sourceData;

  return (
    <>
      <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />
      <EuiSpacer />
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="stretch"
        direction="row"
        gutterSize="xl"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <div className="adding-a-source__intro-image">
            <img src={connectionIllustration} alt={CONFIG_INTRO_ALT_TEXT} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="xl" />
          <EuiTitle size="l">
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.title"
                defaultMessage="How to add {name}"
                values={{ name }}
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <form onSubmit={handleFormSubmit}>
            <EuiForm>
              <EuiText grow={false}>
                {serviceType === 'custom' ? (
                  <>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.workplaceSearch.sources.helpText.custom"
                        defaultMessage="To create a Custom API Source, provide a human-readable and descriptive name. The name will appear as-is in the various search experiences and management interfaces."
                      />
                    </p>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.docs.link.description"
                        defaultMessage="{link} to learn more about Custom API Sources."
                        values={{
                          link: (
                            <EuiLink href={docLinks.workplaceSearchCustomSources} target="_blank">
                              {CONFIG_CUSTOM_LINK_TEXT}
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentGuide.heading"
                        defaultMessage="The {name} connector is fully customizable, and will be self-managed on the infrastructure of your choice."
                        values={{
                          name,
                        }}
                      />
                    </p>
                    <p>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentGuide.description"
                        defaultMessage="To be prepared for configuration, review our {deploymentGuideLink} for all prerequisites needed to quickly deploy the connector package. Finalize your configuration in Enterprise Search with a descriptive name for the {name} content source, and update the connector config file with the source ID provided in the next step."
                        values={{
                          name,
                          deploymentGuideLink: (
                            <EuiLink target="_blank" href={documentationUrl}>
                              <FormattedMessage
                                id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentGuide.linkLabel"
                                defaultMessage="documentation"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                    <p>
                      <EuiLink target="_blank" href={`https://github.com/${githubRepository}`}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentGuide.githubRepoLinkLabel"
                          defaultMessage="Customize the connector here."
                        />
                      </EuiLink>
                    </p>
                    <p>
                      <EuiLink
                        target="_blank"
                        href={'https://discuss.elastic.co/c/enterprise-search/84'}
                      >
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentGuide.discussLinkLabel"
                          defaultMessage="Questions? Discuss here."
                        />
                      </EuiLink>
                    </p>
                    <p>
                      <EuiLink target="_blank" href={'https://www.elastic.co/kibana/feedback'}>
                        <FormattedMessage
                          id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.deploymentGuide.feedbackLinkLabel"
                          defaultMessage="We're always looking to improve. Share your feedback  "
                        />
                      </EuiLink>
                    </p>
                  </>
                )}
              </EuiText>
              <EuiSpacer size="xxl" />
              <EuiFormRow label={SOURCE_NAME_LABEL}>
                <EuiFieldText
                  name="source-name"
                  required
                  data-test-subj="CustomSourceNameInput"
                  value={customSourceNameValue}
                  onChange={handleNameChange}
                />
              </EuiFormRow>
              <EuiSpacer />
              <EuiFormRow>
                <EuiButton
                  color="primary"
                  fill
                  type="submit"
                  isLoading={buttonLoading}
                  data-test-subj="CreateCustomButton"
                >
                  {serviceType === 'custom' ? (
                    CONFIG_CUSTOM_BUTTON
                  ) : (
                    <FormattedMessage
                      id="xpack.enterpriseSearch.workplaceSearch.contentSource.configCustom.createNamedSourceButtonLabel"
                      defaultMessage="Configure {name}"
                      values={{
                        name,
                      }}
                    />
                  )}
                </EuiButton>
              </EuiFormRow>
            </EuiForm>
          </form>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
