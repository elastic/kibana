/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

 import { EuiButton, EuiFieldText } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { importRepo } from '../../actions';
import { RootState } from '../../reducers';

const Footer = styled.div``;
const Header = styled.h3``;

class CodeImportProject extends React.PureComponent<{ importRepo: (p: string) => void, importLoading: boolean }> {
  public state = {
    value: ''
  };

  public onChange = e => {
    this.setState({
      value: e.target.value,
    });
  };

  public submitImportProject = () => {
    this.props.importRepo(this.state.value);
  }

  public render() {
    return (
      <div>
        <Header>Repository Url</Header>
        <div><EuiFieldText
          placeholder="https://github.com/elastic/elasticsearch"
          value={this.state.value}
          onChange={this.onChange}
          aria-label="input project url"
          isLoading={this.props.importLoading}
        /><EuiButton onClick={this.submitImportProject} >Import</EuiButton></div>
        <Footer>E.g. https://github.com/elastic/elasticsearch</Footer>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  importLoading: state.repository.importLoading
});

const mapDispatchToProps = {
  importRepo
}

export const ImportProject = connect(mapStateToProps, mapDispatchToProps)(CodeImportProject);
