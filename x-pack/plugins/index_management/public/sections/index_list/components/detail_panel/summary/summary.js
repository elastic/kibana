/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n }  from '@kbn/i18n';
import { healthToColor } from '../../../../../services';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { getSummaryExtensions } from '../../../../../index_management_extensions';
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
  })
};

export class Summary extends React.PureComponent {
  getAdditionalContent() {
    const { index } = this.props;
    const extensions = getSummaryExtensions();
    console.log(extensions);
    return extensions.map((summaryExtension) => {
      return (
        <Fragment>
          <EuiHorizontalRule />
          { summaryExtension(index) }
        </Fragment>
      );
    });
  }
  buildRows() {
    const { index } = this.props;
    const rows = {
      left: [],
      right: []
    };
    Object.keys(HEADERS).forEach((fieldName, arrayIndex) => {
      const value = index[fieldName];
      const content =
        fieldName === "health" ? (
          <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>
        ) : value;
      const cell = [
        <EuiDescriptionListTitle key={fieldName}>
          <strong>{HEADERS[fieldName]}:</strong>
        </EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key={fieldName + "_desc"}>
          {content}
        </EuiDescriptionListDescription>
      ];
      if (arrayIndex % 2 === 0) {
        rows.left.push(cell);
      } else {
        rows.right.push(cell);
      }
    });
    return rows;
  }

  render() {
    const { left, right } = this.buildRows();
    const additionalContent = this.getAdditionalContent();
    return (
      <Fragment>
        <EuiTitle size="s"><h3>General</h3></EuiTitle>
        <EuiSpacer size="s"/>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList  type="column">
              {left}
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList  type="column">
              {right}
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
        { additionalContent }
      </Fragment>
    );
  }
}
