/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { DataHealth } from '../../../../../components';
import { AppContextConsumer } from '../../../../../app_context';

const getHeaders = (showStats) => {
  const baseHeaders = {
    primary: i18n.translate('xpack.idxMgmt.summary.headers.primaryHeader', {
      defaultMessage: 'Primaries',
    }),
    replica: i18n.translate('xpack.idxMgmt.summary.headers.replicaHeader', {
      defaultMessage: 'Replicas',
    }),
    aliases: i18n.translate('xpack.idxMgmt.summary.headers.aliases', {
      defaultMessage: 'Aliases',
    }),
  };

  if (showStats) {
    return {
      ...baseHeaders,
      health: i18n.translate('xpack.idxMgmt.summary.headers.healthHeader', {
        defaultMessage: 'Health',
      }),
      status: i18n.translate('xpack.idxMgmt.summary.headers.statusHeader', {
        defaultMessage: 'Status',
      }),
      documents: i18n.translate('xpack.idxMgmt.summary.headers.documentsHeader', {
        defaultMessage: 'Docs count',
      }),
      documents_deleted: i18n.translate('xpack.idxMgmt.summary.headers.deletedDocumentsHeader', {
        defaultMessage: 'Docs deleted',
      }),
      size: i18n.translate('xpack.idxMgmt.summary.headers.storageSizeHeader', {
        defaultMessage: 'Storage size',
      }),
      primary_size: i18n.translate('xpack.idxMgmt.summary.headers.primaryStorageSizeHeader', {
        defaultMessage: 'Primary storage size',
      }),
    };
  }
  return baseHeaders;
};

export class Summary extends React.PureComponent {
  getAdditionalContent(extensionsService, getUrlForApp) {
    const { index } = this.props;
    const extensions = extensionsService.summaries;
    return extensions.map((summaryExtension, i) => {
      return (
        <Fragment key={`summaryExtension-${i}`}>
          <EuiHorizontalRule />
          {summaryExtension(index, getUrlForApp)}
        </Fragment>
      );
    });
  }

  buildRows(config) {
    const { index } = this.props;
    const headers = getHeaders(config.enableIndexStats);
    const rows = {
      left: [],
      right: [],
    };
    Object.keys(headers).forEach((fieldName, arrayIndex) => {
      const value = index[fieldName];
      let content = value;
      if (fieldName === 'health') {
        content = <DataHealth health={value} />;
      }
      if (Array.isArray(content)) {
        content = content.join(', ');
      }
      const cell = [
        <EuiDescriptionListTitle key={fieldName} data-test-subj="descriptionTitle">
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
        {({ services, core, config }) => {
          const { left, right } = this.buildRows(config);
          const additionalContent = this.getAdditionalContent(
            services.extensionsService,
            core.getUrlForApp
          );

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
