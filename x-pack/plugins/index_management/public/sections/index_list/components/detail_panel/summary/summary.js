/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n }  from '@kbn/i18n';
import { healthToColor } from '../../../../../services';
import {
  EuiHealth,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

const HEADERS = {
  health: i18n.translate('xpack.idxMgmt.summary.headers.healthHeader', {
    defaultMessage: 'Health',
  }),
  status: i18n.translate('xpack.idxMgmt.summary.headers.statusHeader', {
    defaultMessage: 'Status',
  }),
  primary: i18n.translate('xpack.idxMgmt.summary.headers.primaryHeader', {
    defaultMessage: 'Primaries',
  }),
  replica: i18n.translate('xpack.idxMgmt.summary.headers.replicaHeader', {
    defaultMessage: 'Replicas',
  }),
  documents: i18n.translate('xpack.idxMgmt.summary.headers.documentsHeader', {
    defaultMessage: 'Docs Count',
  }),
  documents_deleted: i18n.translate('xpack.idxMgmt.summary.headers.deletedDocumentsHeader', {
    defaultMessage: 'Docs Deleted',
  }),
  size: i18n.translate('xpack.idxMgmt.summary.headers.storageSizeHeader', {
    defaultMessage: 'Storage Size',
  }),
  primary_size: i18n.translate('xpack.idxMgmt.summary.headers.primaryStorageSizeHeader', {
    defaultMessage: 'Primary Storage Size',
  }),
  aliases: i18n.translate('xpack.kdxMgm.summary.headers.aliases', {
    defaultMessage: 'Aliases'
  })
};

export class Summary extends React.PureComponent {
  buildRows() {
    const { index } = this.props;
    return Object.keys(HEADERS).map(fieldName => {
      const value = index[fieldName];
      let content = value;
      if(fieldName === 'health') {
        content = <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>;
      }
      if(Array.isArray(content)) {
        content = content.join(', ');
      }
      return [
        <EuiDescriptionListTitle key={fieldName}>
          <strong>{HEADERS[fieldName]}:</strong>
        </EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key={fieldName + "_desc"}>
          {content}
        </EuiDescriptionListDescription>
      ];
    });
  }

  render() {
    return (
      <EuiDescriptionList type="column" align="center">
        {this.buildRows()}
      </EuiDescriptionList>
    );
  }
}
