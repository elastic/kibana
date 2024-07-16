/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
import { ConnectorDescriptionPopover } from './components/connector_description_popover';

interface StartStepProps {
  setSelfManaged: Function;
  title: string;
  selfManaged: boolean;
  setConnectorSelected: Function;
  connectorSelected: string;
}

export const StartStep: React.FC<StartStepProps> = ({
  setSelfManaged,
  title,
  selfManaged,
  setConnectorSelected,
  connectorSelected,
}) => {
  const { euiTheme } = useEuiTheme();

  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  const [radioIdSelected, setRadioIdSelected] = useState(
    selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId
  );

  useEffect(() => {
    setSelfManaged(radioIdSelected === selfManagedRadioButtonId ? true : false);
  }, [radioIdSelected]);

  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        {/* Start */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow fullWidth label="Connector">
                  <ChooseConnectorSelectable
                    setConnectorSelected={setConnectorSelected}
                    connectorSelected={connectorSelected}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow fullWidth label="Connector name">
                  <EuiFieldText fullWidth name="first" />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiFormRow fullWidth label="Description">
                <EuiFieldText fullWidth name="first" />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
        {/* Set up */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>Set up</h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>Where do you want to store the connector and how do you want to manage it?</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={elasticManagedRadioButtonId}
                  label="Elastic managed"
                  checked={!selfManaged}
                  onChange={() => setRadioIdSelected(elasticManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isNative={true} />
              </EuiFlexItem>
              &nbsp; &nbsp;
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={selfManagedRadioButtonId}
                  label="Self managed"
                  checked={selfManaged}
                  onChange={() => setRadioIdSelected(selfManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isNative={false} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {/* Configure index */}
        {selfManaged ? (
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="l">
              <EuiTitle size="s">
                <h4>Deployment</h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <p>
                  You will start the process of creating a new index, API key, and a Web Crawler
                  Connector ID manually. Optionally you can bring your own configuration as well.
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton fill>Next</EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="l">
              <EuiTitle size="s">
                <h4>Configure index and API key</h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <p>
                  This process will create a new index, API key, and a Connector ID. Optionally you
                  can bring your own configuration as well.
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton iconType="sparkles" fill>
                Generate configuration
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
