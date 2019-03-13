/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import React, { ChangeEvent } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { importRepo } from '../../actions';
import { RootState } from '../../reducers';

const ImportButton = styled(EuiButton)`
  margin-top: 1.5rem;
`;

const ImportWrapper = styled.div`
  max-width: 800px;
  margin: auto;
`;

class CodeImportProject extends React.PureComponent<
  {
    importRepo: (p: string) => void;
    importLoading: boolean;
  },
  { value: string }
> {
  public state = {
    value: '',
  };

  public onChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      value: e.target.value,
    });
  };

  public submitImportProject = () => {
    this.props.importRepo(this.state.value);
    this.setState({ value: '' });
  };

  public render() {
    return (
      <ImportWrapper>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label="Repository URL"
              helpText="e.g. https://github.com/elastic/elasticsearch"
              fullWidth
            >
              <EuiFieldText
                value={this.state.value}
                onChange={this.onChange}
                aria-label="input project url"
                data-test-subj="importRepositoryUrlInputBox"
                isLoading={this.props.importLoading}
                fullWidth={true}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* 
  // @ts-ignore */}
            <ImportButton
              onClick={this.submitImportProject}
              data-test-subj="importRepositoryButton"
            >
              Import
            </ImportButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ImportWrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  importLoading: state.repository.importLoading,
});

const mapDispatchToProps = {
  importRepo,
};

export const ImportProject = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeImportProject);
