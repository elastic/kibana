/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { healthToColor } from '../../../../../services';
import { AppContextConsumer } from '../../../../../app_context';

const getHeaders = () => {
  return {
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
    aliases: i18n.translate('xpack.idxMgmt.summary.headers.aliases', {
      defaultMessage: 'Aliases',
    }),
  };
};

export class Summary extends React.PureComponent {
  getAdditionalContent(extensionsService) {
    const { index } = this.props;
    const extensions = extensionsService.summaries;
    return extensions.map((summaryExtension, i) => {
      return (
        <Fragment key={`summaryExtension-${i}`}>
          <EuiHorizontalRule />
          {summaryExtension(index)}
        </Fragment>
      );
    });
  }

  buildRows() {
    const { index } = this.props;
    const headers = getHeaders();
    const rows = {
      left: [],
      right: [],
    };
    Object.keys(headers).forEach((fieldName, arrayIndex) => {
      const value = index[fieldName];
      let content = value;
      if (fieldName === 'health') {
        content = <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>;
      }
      if (Array.isArray(content)) {
        content = content.join(', ');
      }
      const cell = [
        <EuiDescriptionListTitle key={fieldName}>
          <strong>{headers[fieldName]}</strong>
        </EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key={fieldName + '_desc'}>
          {content}
        </EuiDescriptionListDescription>,
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
    return (
      <AppContextConsumer>
        {({ services }) => {
          const { left, right } = this.buildRows();
          const additionalContent = this.getAdditionalContent(services.extensionsService);

          return (
            <Fragment>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.idxMgmt.summary.summaryTitle"
                    defaultMessage="General"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiDescriptionList type="column">{left}</EuiDescriptionList>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiDescriptionList type="column">{right}</EuiDescriptionList>
                </EuiFlexItem>
              </EuiFlexGroup>
              {additionalContent}
            </Fragment>
          );
        }}
      </AppContextConsumer>
    );
  }
}
