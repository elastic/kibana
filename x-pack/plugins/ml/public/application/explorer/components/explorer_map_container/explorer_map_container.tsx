/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
// import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';

interface Props {
  tableData: any; // TODO update types
}

export const ExplorerMapContainer: FC<Props> = ({ tableData }) => {
  // console.log('-- TABLE DATA ----', JSON.stringify(tableData, null, 2)); // remove
  return (
    <>
      <EuiPanel data-test-subj="mlAnomalyExplorerAnomaliesMap loaded">
        <div>hello</div>
        {/* <EuiAccordion
      id={this.htmlIdGen()}
      buttonContent={
        <EuiTitle className="panel-title">
          <h2>
            <FormattedMessage
              id="xpack.ml.explorer.annotationsTitle"
              defaultMessage="Annotations {badge}"
              values={{
                badge: (
                  <EuiBadge color={'hollow'}>
                    <FormattedMessage
                      id="xpack.ml.explorer.annotationsTitleTotalCount"
                      defaultMessage="Total: {count}"
                      values={{ count: annotationsData.length }}
                    />
                  </EuiBadge>
                ),
              }}
            />
          </h2>
        </EuiTitle>
      }
    >
      <>
        <AnnotationsTable
          jobIds={selectedJobIds}
          annotations={annotationsData}
          aggregations={aggregations}
          drillDown={true}
          numberBadge={false}
        />
      </>
    </EuiAccordion> */}
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
