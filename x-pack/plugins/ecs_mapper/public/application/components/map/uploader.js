/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { AboutPanel, LoadingPanel, ResultsPanel } from './upload_panel';
import { readFile } from '../util/utils';
import { FieldRenameAction } from '../../../../common';

export class EcsMapperUploadView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileName: '',
      fileContents: '',
      data: [],
      fileSize: 0,
      fileTooLarge: false,
      fileCouldNotBeRead: false,
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

  onFilePickerChange = (files) => {
    this.setState(
      {
        loading: files.length > 0,
        bottomBarVisible: files.length > 0,
        loaded: false,
        fileName: '',
        fileContents: '',
        data: [],
        fileSize: 0,
        fileTooLarge: false,
        fileCouldNotBeRead: false,
        fileCouldNotBeReadPermissionError: false,
      },
      () => {
        if (files.length) {
          this.loadFile(files[0]);
        }
      }
    );
  };

  async loadFile(file) {
    if (file.size <= this.maxFileUploadBytes) {
      try {
        const { data, fileContents } = await readFile(file, this.maxFileUploadBytes);
        this.setState({
          data,
          fileContents,
          fileName: file.name,
          fileSize: file.size,
          loading: true,
        });
        this.props.mapper.fetchPipelineFromMapping(fileContents, FieldRenameAction.Copy);
        this.setState({
          loading: false,
          loaded: true,
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
            <AboutPanel
              onFilePickerChange={this.onFilePickerChange}
              disabled={!fileCouldNotBeReadPermissionError}
            />
          )}

          {loading && <LoadingPanel />}

          {loaded && <ResultsPanel />}
        </>
      </div>
    );
  }
}
