/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { UploadPanel } from './upload_panel';
import { ConfirmationPanel } from './confirmation_panel';
import { ResultsPanel } from './results_panel';
import { ErrorPanel } from './error_panel';
import { readFile } from '../util/utils';
import { FieldCopyAction } from '../../../../common';
import { EuiPage, EuiPageBody, EuiPageContent, EuiSpacer } from '@elastic/eui';

export class EcsMapperUploadView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      loaded: false,
      files: {},
      fileName: '',
      fileSize: 0,
      fileTooLarge: false,
      pipeline: '',
      pipelineName: '',
      error: ''
    };

    this.maxFileUploadBytes = props.fileUpload.getMaxBytes();
  }

  async componentDidMount() {
    // check the user has the correct permission to import data.
    // note, calling hasImportPermission with no arguments just checks the
    // cluster privileges, the user will still need index privileges to create and ingest
    const hasPermissionToImport = await this.props.fileUpload.hasImportPermission({
      checkCreateIndexPattern: false,
      checkHasManagePipeline: true,
    });
    this.setState({ hasPermissionToImport });
  }

  onManageIngestPipeline = () => {
    this.props.navigateToApp('management', {
      path: `/ingest/ingest_pipelines/edit/${this.state.pipelineName}`,
    });
  };

  onFileUpload = (action, files, pipelineName) => {
    this.setState(
      {
        loading: files.length > 0,
        loaded: false,
        fileName: '',
        fileSize: 0,
        fileTooLarge: false,
        fileCouldNotBeRead: false,
        fileCouldNotBeReadPermissionError: false,
        error: ''
      },
      () => {
        if (files.length) {
          this.processFile(files[0], action, pipelineName);
        }
      }
    );
  };

  async processFile(file, action, pipelineName) {
    if (file.size <= this.maxFileUploadBytes) {
      try {
        const { fileContents } = await readFile(file, this.maxFileUploadBytes);
        
        const processors = await this.props.mapper.fetchPipelineFromMapping(fileContents, action);

        //this.createPipeline(pipelineName, processors);
        this.props.mapper.createIngestNodePipeline(pipelineName, processors);

        this.setState({
          ...this.state,
          loading: false,
          loaded: true,
          fileContents,
          fileName: file.name,
          fileSize: file.size,
          pipeline: processors
        });
      } catch (error) {
        this.setState({
          loaded: false,
          loading: false,
        });
      }
    } else {
      this.setState({
        loaded: false,
        loading: false,
        fileTooLarge: true,
        fileName: file.name,
        fileSize: file.size,
      });
    }
  }

  async createPipeline(pipelineName, processors) {
    const resp = this.props.mapper.createIngestNodePipeline(pipelineName, processors);
    resp.catch(error => {
      this.setState({
        ...this.state,
        error: error,
        loaded: false
      });
    })
  }

  render() {
    const { loading, loaded, pipeline, pipelineName, error } = this.state;

    return (
      <EuiPage className="prfDevTool__page mapper-main" data-test-subj="ecsMapperFileUpload">
        <EuiPageBody className="prfDevTool__page__pageBody">
          <EuiPageContent className="prfDevTool__page__pageBodyContent">
            
            <UploadPanel
              onFileUpload={this.onFileUpload}
              actionOptions={Object.values(FieldCopyAction)}
              isLoading={loading}
              isLoaded={loaded}
            />

            <EuiSpacer size="m" />

            <ConfirmationPanel
              processors={pipeline}
            />

            {loaded && (
              <ResultsPanel
                pipelineName={pipelineName}
                onManageIngestPipeline={this.onManageIngestPipeline}
              />
            )}

            {error && (
              <ErrorPanel
                error={error}
              />
            )}

          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
