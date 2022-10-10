/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import type { FunctionComponent } from 'react';
import React from 'react';
import { UploadFile } from '../upload_file';

import { useFilesContext } from '../context';

export interface Props<Kind extends string = string> {
  kind: Kind;
}

export const FilePicker: FunctionComponent<Props> = ({}) => {
  return <p>OK</p>;
};
