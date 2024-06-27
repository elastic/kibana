/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { sendRequest } from '../../../hooks';

import { debugRoutesService } from '../../../../../../common/services';

import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  API_VERSIONS,
} from '../../../../../../common/constants';

import { CodeBlock } from './code_block';
import { SavedObjectNamesCombo } from './saved_object_names_combo';

const fetchSavedObjects = async (type?: string, name?: string) => {
  if (!type || !name) return;

  const response = await sendRequest({
    method: 'post',
    path: debugRoutesService.getSavedObjectsPath(),
    body: {
      type,
      name,
    },
    version: API_VERSIONS.internal.v1,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.saved_objects;
};

export const SavedObjectDebugger: React.FunctionComponent = () => {
  const types = [
    {
      value: `${AGENT_POLICY_SAVED_OBJECT_TYPE}`,
      text: i18n.translate('xpack.fleet.debug.savedObjectDebugger.agentPolicyLabel', {
        defaultMessage: 'Agent policy',
      }),
    },
    {
      value: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}`,
      text: i18n.translate('xpack.fleet.debug.savedObjectDebugger.packagePolicyLabel', {
        defaultMessage: 'Integration policy',
      }),
    },
    {
      value: `${OUTPUT_SAVED_OBJECT_TYPE}`,
      text: i18n.translate('xpack.fleet.debug.savedObjectDebugger.outputLabel', {
        defaultMessage: 'Output',
      }),
    },
    {
      value: `${PACKAGES_SAVED_OBJECT_TYPE}`,
      text: i18n.translate('xpack.fleet.debug.savedObjectDebugger.packageLabel', {
        defaultMessage: 'Packages',
      }),
    },
    {
      value: `${DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE}`,
      text: i18n.translate('xpack.fleet.debug.savedObjectDebugger.downloadSourceLabel', {
        defaultMessage: 'Download Sources',
      }),
    },
    {
      value: `${FLEET_SERVER_HOST_SAVED_OBJECT_TYPE}`,
      text: i18n.translate('xpack.fleet.debug.savedObjectDebugger.fleetServerHostLabel', {
        defaultMessage: 'Fleet Server Hosts',
      }),
    },
  ];

  const [type, setType] = useState(types[0].value);
  const [name, setName] = useState<string | undefined>();
  const [namesStatus, setNamesStatus] = useState();

  const childRef = useRef<{ refetchNames: Function }>();

  const onTypeChange = (e: any) => {
    setType(e.target.value);
    setName(undefined);
    childRef.current!.refetchNames();
  };

  const { data: savedObjectResult, status } = useQuery(['debug-saved-objects', type, name], () =>
    fetchSavedObjects(type, name)
  );

  return (
    <>
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="xpack.fleet.debug.savedObjectDebugger.description"
            defaultMessage="Search for Fleet-related saved objects by selecting a type and name. Use the code block below to diagnose any potential issues."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" justifyContent="flexStart">
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 300px;
          `}
        >
          <EuiFormRow>
            <EuiSelect
              prepend="Type"
              id="soType"
              options={types}
              value={type}
              onChange={(e) => onTypeChange(e)}
              aria-label={i18n.translate('xpack.fleet.debug.savedObjectDebugger.selectTypeLabel', {
                defaultMessage: 'Select saved object type',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 400px;
          `}
        >
          <EuiFormRow>
            <SavedObjectNamesCombo
              name={name!}
              setName={setName}
              type={type}
              setNamesStatus={setNamesStatus}
              ref={childRef}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {savedObjectResult && (status === 'error' || namesStatus === 'error') && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="Error" color="danger">
            <FormattedMessage
              id="xpack.fleet.debug.savedObjectDebugger.fetchError"
              defaultMessage="Error fetching Saved Objects"
            />
          </EuiCallOut>
        </>
      )}

      {/* Allowing this to render while status === loading prevents the Code Block UI from
      flickering when selecting a new object */}
      {(savedObjectResult || status === 'loading') && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(savedObjectResult, null, 2)} />
        </>
      )}
    </>
  );
};
