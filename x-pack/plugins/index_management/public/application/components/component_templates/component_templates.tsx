/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiText,
  EuiEmptyPrompt,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
} from '@elastic/eui';

import { ComponentTemplateDeserialized } from '../../../../common';
import { CreateButtonPopOver } from './components';
import { ComponentTemplatesList } from './component_templates_list';

interface Props {
  isLoading: boolean;
  components: ComponentTemplateDeserialized[];
  emptyPrompt?: {
    text?: string | JSX.Element;
    showCreateButton?: boolean;
  };
}

function fuzzyMatch(pattern: string, text: string) {
  pattern = '.*' + pattern.split('').join('.*') + '.*';
  const re = new RegExp(pattern);
  return re.test(text);
}

export const ComponentTemplates = ({
  isLoading,
  components,
  emptyPrompt: { text, showCreateButton } = {},
}: Props) => {
  const [searchValue, setSearchValue] = useState('');

  const filteredComponents = useMemo<ComponentTemplateDeserialized[]>(() => {
    if (isLoading) {
      return [];
    }
    if (searchValue === '') {
      return components;
    }
    return components.filter((component) => {
      const match = fuzzyMatch(searchValue, component.name);
      return match;
    });
  }, [isLoading, components, searchValue]);

  const renderEmptyPrompt = () => {
    const emptyPromptBody = (
      <EuiText color="subdued">
        {text ?? (
          <p>
            <FormattedMessage
              id="xpackidxMgmt.componentTemplatesFlyout.subhead"
              defaultMessage="Components templates let you save index settings, mappings and aliases and inherit from them in index templates."
            />
            <br />
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/master//indices-component-template.html"
              target="_blank"
            >
              <FormattedMessage
                id="xpackidxMgmt.componentTemplatesFlyout.emptyPromptLearnMoreLinkText"
                defaultMessage="Learn more."
              />
            </EuiLink>
          </p>
        )}
      </EuiText>
    );
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h2 style={{ fontSize: '1.5rem' }}>
            <FormattedMessage
              id="xpackidxMgmt.componentTemplatesFlyout.emptyPromptTitle"
              defaultMessage="You don’t have any components yet"
            />
          </h2>
        }
        body={emptyPromptBody}
        actions={showCreateButton ? <CreateButtonPopOver anchorPosition="downCenter" /> : undefined}
        data-test-subj="emptyPrompt"
      />
    );
  };

  if (isLoading) {
    return null;
  }

  if (components.length === 0) {
    return renderEmptyPrompt();
  }

  return (
    <>
      <div>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder="Search components"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              aria-label="Search components"
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem>View</EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div>
        <ComponentTemplatesList components={filteredComponents} />
      </div>
    </>
  );
};
