/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';

import { EuiAccordion, EuiPagination } from '@elastic/eui';
import { css } from '@emotion/react';

const PAGE_SIZE = 100;

export interface DocFailure {
  item: number;
  reason: string;
  doc: {
    message: string;
  };
}

interface Props {
  failedDocs: DocFailure[];
}

interface State {
  page: number;
}

const containerStyle = css({
  maxHeight: '200px',
  overflowY: 'auto',
});

const errorStyle = css({
  color: euiThemeVars.euiColorDanger,
});

export class Failures extends Component<Props, State> {
  state: State = { page: 0 };

  _renderPaginationControl() {
    return this.props.failedDocs.length > PAGE_SIZE ? (
      <EuiPagination
        pageCount={Math.ceil(this.props.failedDocs.length / PAGE_SIZE)}
        activePage={this.state.page}
        onPageClick={(page) => this.setState({ page })}
        compressed
      />
    ) : null;
  }

  render() {
    const startIndex = this.state.page * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return (
      <EuiAccordion
        id="failureList"
        buttonContent={
          <FormattedMessage
            id="xpack.dataVisualizer.file.importSummary.failedDocumentsButtonLabel"
            defaultMessage="Failed documents"
          />
        }
        paddingSize="m"
      >
        <div css={containerStyle}>
          {this._renderPaginationControl()}
          {this.props.failedDocs.slice(startIndex, endIndex).map(({ item, reason, doc }) => (
            <div key={item}>
              <div css={errorStyle}>
                {item}: {reason}
              </div>
              <div>{JSON.stringify(doc)}</div>
            </div>
          ))}
        </div>
      </EuiAccordion>
    );
  }
}
