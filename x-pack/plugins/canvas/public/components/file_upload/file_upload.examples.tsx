/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { getEmptyFunction } from './../examples';
import { FileUpload } from './file_upload';

storiesOf('FileUpload', module).add('default props', () => (
  <FileUpload onUpload={getEmptyFunction()} />
));
