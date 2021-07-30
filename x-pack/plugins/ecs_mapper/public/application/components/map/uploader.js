/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { UploadPanel } from './upload_panel';
import { LoadingPanel } from './loading_panel';
import { ResultsPanel } from './results_panel';
import { readFile } from '../util/utils';
import { FieldCopyAction } from '../../../../common';

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
      fileCouldNotBeRead: false,
      pipelineName: ''
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
    console.log("routing");
    this.props.navigateToApp('management', {
      path: `/ingest/ingest_pipelines/edit/${this.state.pipelineName}`,
    });
  }

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
        pipelineName: pipelineName
      },
      () => {
        if (files.length) {
          this.loadFile(files[0], action);
        }
      }
    );
  };

  async loadFile(file, action) {
    if (file.size <= this.maxFileUploadBytes) {
      try {
        const { fileContents } = await readFile(file, this.maxFileUploadBytes);
        this.setState({
          fileContents,
          fileName: file.name,
          fileSize: file.size,
          loading: true,
        });
        const processors = await this.props.mapper.fetchPipelineFromMapping(
          fileContents,
          action
        );
        await this.props.mapper.createIngestNodePipeline(
          this.state.pipelineName,
          processors
        );
        this.setState({
          loading: false,
          loaded: true
        });
      } catch (error) {
        this.setState({
          loaded: false,
          loading: false,
          fileCouldNotBeRead: true,
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

  onCancel = () => {
    this.onFilePickerChange([]);
  };

  render() {
    const { loading, loaded, fileCouldNotBeReadPermissionError } = this.state;

    return (
      <div>
        <>
          {!loading && !loaded && (
            <UploadPanel
              onFileUpload={this.onFileUpload}
              actionOptions={Object.values(FieldCopyAction)}
              disabled={!fileCouldNotBeReadPermissionError}
            />
          )}

          {loading && <LoadingPanel />}

          {loaded && (
            <ResultsPanel
              pipelineName={this.state.pipelineName}
              onManageIngestPipeline={this.onManageIngestPipeline}
            />
          )}
        </>
      </div>
    );
  }
}
