/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { memo, useEffect } from 'react';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
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
    RenderComponent: (props) => {
      window.console.log(`upload command rendering...`);
      window.console.log(props);

      return (
        <div>
          <div>{`ExecuteFileAction DEV MOCK`}</div>
          <div>
            <strong>{`File Selected: ${props.command.args.args.file[0].name}`}</strong>
          </div>
        </div>
      );
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
        mustHaveValue: true,
        validate: () => {
          // FIXME:PT Validate File was selected
          return true;
        },
        SelectorComponent: ArgumentFileSelector,
      },

      n: {
        required: false,
        allowMultiples: true,
        mustHaveValue: 'number-greater-than-zero',
        about: 'just a number greater than zero',
      },

      nn: {
        required: false,
        allowMultiples: true,
        mustHaveValue: 'number',
        about: 'just a number',
      },

      mock: {
        required: false,
        allowMultiples: false,
        about: 'using a selector',
        SelectorComponent: ArgumentSelectorComponentTest,
      },

      comment: {
        required: false,
        allowMultiples: false,
        mustHaveValue: 'non-empty-string',
        about: 'A comment',
      },
    },
    helpGroupLabel: 'DEV',
    helpGroupPosition: 0,
    helpCommandPosition: 0,
  };
};

const ArgumentSelectorComponentTest = memo<
  CommandArgumentValueSelectorProps<{ selection: string }>
>(({ value, valueText, onChange, argIndex, argName }) => {
  useEffect(() => {
    if (!value) {
      onChange({ valueText: 'foo selected', value: { selection: 'foo' } });
    }
  }, [onChange, value]);

  return (
    <span data-test-subj="argSelectorValueText">{`${argName}[${argIndex}]: ${valueText}`}</span>
  );
});
ArgumentSelectorComponentTest.displayName = 'ArgumentSelectorComponentTest';

document.body.classList.add('style2');
