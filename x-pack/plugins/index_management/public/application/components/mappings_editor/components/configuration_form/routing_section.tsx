/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';

import { documentationService } from '../../../../services/documentation';
import { UseField, FormRow, ToggleField } from '../../shared_imports';

export const RoutingSection = () => {
  return (
    <FormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.routingTitle', {
        defaultMessage: '_routing',
      })}
      description={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.routingDescription"
          defaultMessage="A document can be routed to a particular shard in an index. When using custom routing, it is important to provide the routing value whenever indexing a document as otherwise this could lead to a document being indexed on more than one shard. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.getRoutingLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.routingDocumentionLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
      }
    >
      <UseField
        path="_routing.required"
        component={ToggleField}
        componentProps={{ 'data-test-subj': 'routingRequiredToggle' }}
      />
    </FormRow>
  );
};
