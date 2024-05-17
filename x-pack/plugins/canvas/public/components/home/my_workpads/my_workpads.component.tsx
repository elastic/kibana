/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { FoundWorkpad } from '../../../services/workpad';
import { HomeEmptyPrompt } from './empty_prompt';
import { UploadDropzone } from './upload_dropzone';
import { WorkpadTable } from './workpad_table';

export interface Props {
  workpads: FoundWorkpad[];
}

export const MyWorkpads = ({ workpads }: Props) => {
  if (workpads.length === 0) {
    return (
      <UploadDropzone>
        <EuiFlexGroup justifyContent="spaceAround" alignItems="center" style={{ minHeight: 600 }}>
          <EuiFlexItem grow={false}>
            <HomeEmptyPrompt />
          </EuiFlexItem>
        </EuiFlexGroup>
      </UploadDropzone>
    );
  }

  return (
    <UploadDropzone>
      <WorkpadTable />
    </UploadDropzone>
  );
};
