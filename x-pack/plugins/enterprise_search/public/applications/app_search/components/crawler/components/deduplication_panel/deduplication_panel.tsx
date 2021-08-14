/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { DOCS_PREFIX } from '../../../../routes';
import { CrawlerSingleDomainLogic } from '../../crawler_single_domain_logic';

import { getCheckedOptionLabels, getSelectableOptions } from './utils';

import './deduplication_panel.scss';

export const DeduplicationPanel: React.FC = () => {
  const { domain } = useValues(CrawlerSingleDomainLogic);
  const { submitDeduplicationUpdate } = useActions(CrawlerSingleDomainLogic);

  const [showAllFields, setShowAllFields] = useState(true);

  if (!domain) {
    return null;
  }

  const { deduplicationEnabled, availableDeduplicationFields, deduplicationFields } = domain;

  const selectableOptions = getSelectableOptions(
    availableDeduplicationFields,
    deduplicationFields,
    showAllFields,
    deduplicationEnabled
  );

  return (
    <div className="deduplicationPanel">
      <EuiFlexGroup direction="row" alignItems="stretch">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.title', {
                defaultMessage: 'Duplicate document handling',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="warning"
            iconType="refresh"
            size="s"
            onClick={() => submitDeduplicationUpdate(domain, { fields: [] })}
            disabled={deduplicationFields.length === 0}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.resetToDefaultsButtonLabel',
              {
                defaultMessage: 'Reset to defaults',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.description"
            defaultMessage="The web crawler only indexes unique pages. Choose which fields the crawler should use when
            considering which pages are duplicates. Deselect all schema fields to allow duplicate
            documents on this domain. {documentationLink}."
            values={{
              documentationLink: (
                <EuiLink
                  href={`${DOCS_PREFIX}/web-crawler-reference.html#web-crawler-reference-content-deduplication`}
                  target="_blank"
                  external
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.learnMoreMessage',
                    {
                      defaultMessage: 'Learn more about content hashing',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiSwitch
            label="Prevent duplicate documents"
            checked={deduplicationEnabled}
            onChange={() =>
              deduplicationEnabled
                ? submitDeduplicationUpdate(domain, { enabled: false, fields: [] })
                : submitDeduplicationUpdate(domain, { enabled: true })
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            options={[
              {
                id: 'all_fields',
                label: i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.allFieldsLabel',
                  {
                    defaultMessage: 'All fields',
                  }
                ),
              },
              {
                id: 'selected_fields',
                label: i18n.translate(
                  'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.selectedFieldsLabel',
                  {
                    defaultMessage: 'Selected fields',
                  }
                ),
              },
            ]}
            legend={i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.showAllFieldsToggleDescription',
              {
                defaultMessage: 'Select which schema fields to display in the list.',
              }
            )}
            idSelected={showAllFields ? 'all_fields' : 'selected_fields'}
            onChange={() => setShowAllFields(!showAllFields)}
            color="primary"
            buttonSize="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <div className="selectableWrapper">
            <EuiSelectable
              options={selectableOptions}
              onChange={(options) =>
                submitDeduplicationUpdate(domain, {
                  fields: getCheckedOptionLabels(options as Array<EuiSelectableLIOption<object>>),
                })
              }
              searchable
              searchProps={{ disabled: !deduplicationEnabled }}
            >
              {(list, search) => (
                <>
                  {search}
                  {list}
                </>
              )}
            </EuiSelectable>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
