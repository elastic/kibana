/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import type { CommandDefinition } from '../../console';
import { ArgumentFileSelector } from '../../console_argument_selectors';

// FOR DEV PURPOSES ONLY. WILL BE DELETED PRIOR TO MERGE
// FIXME:PT DELETE FILE
export const getUploadCommand = ({
  endpointAgentId,
  endpointPrivileges,
  endpointCapabilities,
}: {
  endpointAgentId: string;
  endpointCapabilities: any;
  endpointPrivileges: any;
}): CommandDefinition => {
  return {
    name: 'upload',
    about: 'Upload and execute a file on host machine',
    RenderComponent: () => {
      return <div>{'rendered!'}</div>;
    },
    meta: {
      endpointId: endpointAgentId,
      capabilities: endpointCapabilities,
      privileges: endpointPrivileges,
    },
    exampleUsage: 'some example goes here',
    exampleInstruction: 'some instructions here',
    args: {
      file: {
        about: 'Select the file that should be uploaded and executed',
        required: true,
        allowMultiples: false,
        validate: () => {
          // FIXME:PT Validate File was selected
          return true;
        },
        SelectorComponent: ArgumentFileSelector,
      },
      comment: {
        required: false,
        allowMultiples: false,
        about: 'A comment',
      },
    },
    helpGroupLabel: 'DEV',
    helpGroupPosition: 0,
    helpCommandPosition: 0,
  };
};
