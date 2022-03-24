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
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';

import { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DUPLICATE_DOCS_URL } from '../../../../routes';
import { DataPanel } from '../../../data_panel';
import { CrawlerSingleDomainLogic } from '../../crawler_single_domain_logic';

import { getCheckedOptionLabels, getSelectableOptions } from './utils';

import './deduplication_panel.scss';

export const DeduplicationPanel: React.FC = () => {
  const { domain } = useValues(CrawlerSingleDomainLogic);
  const { submitDeduplicationUpdate } = useActions(CrawlerSingleDomainLogic);

  const [showAllFields, setShowAllFields] = useState(true);
  const [showAllFieldsPopover, setShowAllFieldsPopover] = useState(false);

  if (!domain) {
    return null;
  }

  const { deduplicationEnabled, deduplicationFields } = domain;

  const selectableOptions = getSelectableOptions(domain, showAllFields);

  return (
    <DataPanel
      hasBorder
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.title', {
            defaultMessage: 'Duplicate document handling',
          })}
        </h2>
      }
      action={
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
      }
      subtitle={
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.description"
          defaultMessage="The web crawler only indexes unique pages. Choose which fields the crawler should use when
          considering which pages are duplicates. Deselect all schema fields to allow duplicate
          documents on this domain. {documentationLink}."
          values={{
            documentationLink: (
              <EuiLink href={DUPLICATE_DOCS_URL} target="_blank" external>
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
      }
    >
      <EuiSwitch
        label="Prevent duplicate documents"
        checked={deduplicationEnabled}
        onChange={() =>
          deduplicationEnabled
            ? submitDeduplicationUpdate(domain, { enabled: false, fields: [] })
            : submitDeduplicationUpdate(domain, { enabled: true })
        }
      />
      <EuiSpacer />
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
              searchProps={{
                disabled: !deduplicationEnabled,
                append: (
                  <EuiPopover
                    button={
                      <EuiButtonEmpty
                        size="xs"
                        iconType="arrowDown"
                        iconSide="right"
                        onClick={() => setShowAllFieldsPopover(!showAllFieldsPopover)}
                        className="showAllFieldsPopoverToggle"
                        disabled={!deduplicationEnabled}
                      >
                        {showAllFields
                          ? i18n.translate(
                              'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.allFieldsLabel',
                              {
                                defaultMessage: 'All fields',
                              }
                            )
                          : i18n.translate(
                              'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.selectedFieldsLabel',
                              {
                                defaultMessage: 'Selected fields',
                              }
                            )}
                      </EuiButtonEmpty>
                    }
                    isOpen={showAllFieldsPopover}
                    closePopover={() => setShowAllFieldsPopover(false)}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenuPanel
                      items={[
                        <EuiContextMenuItem
                          key="all fields"
                          icon={showAllFields ? 'check' : 'empty'}
                          onClick={() => {
                            setShowAllFields(true);
                            setShowAllFieldsPopover(false);
                          }}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.appSearch.crawler.deduplicationPanel.showAllFieldsButtonLabel',
                            {
                              defaultMessage: 'Show all fields',
                            }
                          )}
                        </EuiContextMenuItem>,
                        <EuiContextMenuItem
                          key="selected fields"
                          icon={showAllFields ? 'empty' : 'check'}
                          onClick={() => {
                            setShowAllFields(false);
                            setShowAllFieldsPopover(false);
                          }}
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.appSearch.crawler.crawlerStatusIndicator.showSelectedFieldsButtonLabel',
                            {
                              defaultMessage: 'Show only selected fields',
                            }
                          )}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                ),
              }}
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
    </DataPanel>
  );
};
