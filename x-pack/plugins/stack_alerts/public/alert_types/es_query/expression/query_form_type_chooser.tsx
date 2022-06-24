/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export enum QueryFormType {
  KQL_OR_LUCENE = 'kql_or_lucene',
  QUERY_DSL = 'query_dsl',
}

const FORM_TYPE_ITEMS: Array<{ formType: QueryFormType; label: string; description: string }> = [
  {
    formType: QueryFormType.KQL_OR_LUCENE,
    label: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.selectQueryFormType.kqlOrLuceneFormTypeLabel',
      {
        defaultMessage: 'KQL or Lucene',
      }
    ),
    description: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.selectQueryFormType.kqlOrLuceneFormTypeDescription',
      {
        defaultMessage:
          'Make use of a data view, write the query using KQL or Lucene and add filters.',
      }
    ),
  },
  {
    formType: QueryFormType.QUERY_DSL,
    label: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.selectQueryFormType.queryDslFormTypeLabel',
      {
        defaultMessage: 'Query DSL',
      }
    ),
    description: i18n.translate(
      'xpack.stackAlerts.esQuery.ui.selectQueryFormType.queryDslFormTypeDescription',
      {
        defaultMessage: 'Make use of the powerful Query DSL of Elasticsearch.',
      }
    ),
  },
];

export interface QueryFormTypeProps {
  activeFormType: QueryFormType | null;
  onFormTypeSelect: (formType: QueryFormType | null) => void;
}

export const QueryFormTypeChooser: React.FC<QueryFormTypeProps> = ({
  activeFormType,
  onFormTypeSelect,
}) => {
  if (activeFormType) {
    const activeFormTypeItem = FORM_TYPE_ITEMS.find((item) => item.formType === activeFormType);

    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xs" data-test-subj="selectedRuleFormTypeTitle">
              <h5>{activeFormTypeItem?.label}</h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              data-test-subj="queryFormTypeChooserCancel"
              aria-label={i18n.translate(
                'xpack.stackAlerts.esQuery.ui.selectQueryFormType.deleteAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => onFormTypeSelect(null)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText color="subdued" size="s" data-test-subj="selectedRuleFormTypeDescription">
          {activeFormTypeItem?.description}
        </EuiText>
        <EuiSpacer />
      </>
    );
  }

  return (
    <>
      <EuiTitle size="xs">
        <h5 data-test-subj="queryFormTypeChooserTitle">
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectQueryFormTypeLabel"
            defaultMessage="Select a query type"
          />
        </h5>
      </EuiTitle>
      <EuiListGroup flush gutterSize="m" size="l" maxWidth={false}>
        {FORM_TYPE_ITEMS.map((item) => (
          <EuiListGroupItem
            wrapText
            key={`form-type-${item.formType}`}
            data-test-subj={`queryFormType_${item.formType}`}
            color="primary"
            label={
              <span>
                <strong>{item.label}</strong>
                <EuiText color="subdued" size="s">
                  <p>{item.description}</p>
                </EuiText>
              </span>
            }
            onClick={() => onFormTypeSelect(item.formType)}
          />
        ))}
      </EuiListGroup>
      <EuiSpacer />
    </>
  );
};
