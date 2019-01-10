/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiAccordion, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { ReindexWarning } from '../../../../../../common/types';

export const ReindexWarningSummary: React.StatelessComponent<{
  warnings?: ReindexWarning[];
}> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <React.Fragment>
      <EuiText>
        <h3>This index requires destructive changes</h3>
        <p>
          <strong>This cannot be undone.</strong> It is highly advised you backup this index before
          proceeding.
        </p>
      </EuiText>

      <EuiSpacer />

      {warnings.includes(ReindexWarning.allField) && (
        <EuiAccordion id="reindexWarning-allField" buttonContent="_all field will be removed">
          <EuiSpacer />
          <EuiText>
            <p>
              The <code>_all</code> meta field is no longer supported in 7.0 and reindexing will
              remove this field in the new index. Ensure that you have no application code or
              scripts relying on this field to exist before reindexing.
            </p>
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/6.0/breaking_60_mappings_changes.html#_the_literal__all_literal_meta_field_is_now_disabled_by_default"
              target="_blank"
            >
              Documentation
            </EuiLink>
          </EuiText>
        </EuiAccordion>
      )}

      <EuiSpacer />

      {warnings.includes(ReindexWarning.booleanFields) && (
        <EuiAccordion
          id="reindexWarning-booleanFields"
          buttonContent="Boolean data in _source may change"
        >
          <EuiSpacer />
          <EuiText>
            <p>
              If any documents contain any boolean fields that are not <code>true</code> or{' '}
              <code>false</code>, (eg. <code>"yes"</code>, <code>"on"</code>, <code>1</code>),
              reindexing will convert these fields in the <em>source document</em> to be{' '}
              <code>true</code> or <code>false</code>. Ensure that you have no application code or
              scripts relying on boolean fields in the deprecated format before reindexing.
            </p>
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/6.0/breaking_60_mappings_changes.html#_coercion_of_boolean_fields"
              target="_blank"
            >
              Documentation
            </EuiLink>
          </EuiText>
        </EuiAccordion>
      )}
    </React.Fragment>
  );
};
