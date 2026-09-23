/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function UnsupportedKueryFieldsWarning({ fields }: { fields: string[] }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="apmOperationsUnsupportedKueryFieldsWarning"
        color="warning"
        iconType="warning"
        size="s"
        title={i18n.translate(
          'xpack.apm.dependencyDetailOperationsList.unsupportedKueryFieldsWarningTitle',
          {
            defaultMessage:
              'Filtering operations is only supported for span fields (e.g. span.name). The following {count, plural, one {field is} other {fields are}} not supported and will not return results: {fields}',
            values: { count: fields.length, fields: fields.join(', ') },
          }
        )}
      />
      <EuiSpacer size="m" />
    </>
  );
}
