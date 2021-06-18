/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
} from '@elastic/eui';
import { HttpStart } from 'kibana/public';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { CopyCommands } from '../copy_commands';
import { getCommands } from './commands/get_commands';

interface Props {
  variantId: string;
  http: HttpStart;
  basePath: string;
  isCloudEnabled: boolean;
}

const CentralizedContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const onPremStandaloneOption = {
  key: 'onPrem_standalone',
  label: 'Default Standalone configuration',
  apmServerUrl: 'http://localhost:8200',
  secretKey: '',
  checked: 'on',
};

type APIResponseType = APIReturnType<'GET /api/apm/fleet/agents'>;
const INITIAL_STATE: APIResponseType = {
  agentsCredentials: [],
  cloudAgentPolicyCredential: undefined,
  cloudCredentials: undefined,
};

type SelectValuesType = 'onPrem_standalone' | 'cloud_standalone' | string;

interface Credential {
  key: string;
  label: string;
  apmServerUrl?: string;
  secretToken?: string;
  checked?: 'on';
}

function TutorialAgentSecretTokenSelector({
  variantId,
  http,
  basePath,
  isCloudEnabled,
}: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [data, setData] = useState<APIResponseType>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [options, setOptions] = useState<Credential[]>([]);
  const [option, setOption] = useState<Credential>();

  useEffect(() => {
    const checkedOption = options.find(({ checked }) => checked === 'on');
    setOption(checkedOption);
  }, [options]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await http.get('/api/apm/fleet/agents');
        setData(response as APIResponseType);
      } catch (e) {
        console.error('Error while fetching fleet agents.', e);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [http]);

  useEffect(() => {
    const newOptions = [];
    if (isCloudEnabled) {
      // has Elastic Cloud managed policy
      if (data.cloudAgentPolicyCredential) {
        const {
          id,
          name,
          apmServerUrl,
          secretToken,
        } = data.cloudAgentPolicyCredential;
        newOptions.push({
          key: id,
          label: name,
          apmServerUrl,
          secretToken,
          checked: 'on',
        });
      } else {
        // adds standalone cloud
        newOptions.push({
          key: 'cloud_standalone',
          label: 'Default Standalone configuration',
          apmServerUrl: data.cloudCredentials?.apmServerUrl,
          secretToken: data.cloudCredentials?.secretToken,
          checked: 'on',
        });
      }
    } else {
      // when onPrem
      newOptions.push(onPremStandaloneOption);
    }

    newOptions.push(
      ...data.agentsCredentials?.map(
        ({ id, name, apmServerUrl, secretToken }) => ({
          key: id,
          label: name,
          apmServerUrl,
          secretToken,
        })
      )
    );
    setOptions(newOptions);
  }, [data, isCloudEnabled]);

  if (isLoading) {
    return (
      <CentralizedContainer>
        <EuiLoadingSpinner />
      </CentralizedContainer>
    );
  }

  const command = getCommands({
    variantId,
    environmentDetails: {
      apmServerUrl: option?.apmServerUrl,
      secretToken: option?.secretToken,
    },
  });

  function toggleIsPopoverOpen() {
    setIsPopoverOpen((state) => !state);
  }

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiPopover
            button={
              <EuiButtonEmpty
                iconType="arrowDown"
                iconSide="right"
                onClick={toggleIsPopoverOpen}
              >
                {option?.label}
              </EuiButtonEmpty>
            }
            isOpen={isPopoverOpen}
            closePopover={toggleIsPopoverOpen}
          >
            <EuiSelectable
              searchable
              searchProps={{ placeholder: 'Search', compressed: true }}
              options={options}
              onChange={(newOptions) => setOptions(newOptions)}
              singleSelection
            >
              {(list, search) => (
                <div style={{ width: 240 }}>
                  <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                  {list}
                  <EuiPopoverFooter paddingSize="s">
                    <EuiButton size="s" fullWidth>
                      Manage this list
                    </EuiButton>
                  </EuiPopoverFooter>
                </div>
              )}
            </EuiSelectable>
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CopyCommands commands={command} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiCodeBlock language="bash">{command}</EuiCodeBlock>
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default TutorialAgentSecretTokenSelector;
