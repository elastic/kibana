/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { ConfigKey } from '../../../../common/runtime_types';
import { Validation } from '../../../../common/types';
import { usePolicyConfigContext } from '../../fleet_package/contexts';
import { ServiceLocations } from './locations';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  validate: Validation;
}

export const MonitorNameAndLocation = ({ validate }: Props) => {
  const {
    name,
    setName,
    locations = [],
    setLocations,
    namespace,
    setNamespace,
  } = usePolicyConfigContext();
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);
  const isNameInvalid = !!validate[ConfigKey.NAME]?.({ [ConfigKey.NAME]: name });
  const isLocationsInvalid = !!validate[ConfigKey.LOCATIONS]?.({
    [ConfigKey.LOCATIONS]: locations,
  });
  const namespaceErrorMsg = validate[ConfigKey.NAMESPACE]?.({
    [ConfigKey.NAMESPACE]: namespace,
  });
  const isNamespaceInvalid = !!namespaceErrorMsg;
  const { services } = useKibana();

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorNameFieldLabel"
            defaultMessage="Monitor name"
          />
        }
        fullWidth={true}
        isInvalid={isNameInvalid}
        error={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorNameFieldError"
            defaultMessage="Monitor name is required"
          />
        }
      >
        <EuiFieldText
          autoFocus={true}
          defaultValue={name}
          required={true}
          isInvalid={isNameInvalid}
          fullWidth={true}
          name="name"
          onChange={(event) => setName(event.target.value)}
        />
      </EuiFormRow>
      {/* Advanced options toggle */}
      <EuiFormRow>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
              onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
              flush="left"
            >
              <FormattedMessage
                id="xpack.uptime.monitorManagement.advancedOptionsFieldLabel"
                defaultMessage="Advanced options"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!isShowingAdvanced && !!isNamespaceInvalid ? (
            <EuiFlexItem grow={false}>
              <EuiText color="danger" size="s">
                <FormattedMessage
                  id="xpack.uptime.monitorManagement.errorCountText"
                  defaultMessage="{count, plural, one {# error} other {# errors}}"
                  values={{ count: 1 }}
                />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFormRow>
      {/* Advanced options content */}
      {isShowingAdvanced ? (
        <EuiFormRow>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                isInvalid={isNamespaceInvalid}
                error={namespaceErrorMsg}
                label={
                  <FormattedMessage
                    id="xpack.uptime.monitorManagement.monitorNamespaceFieldLabel"
                    defaultMessage="Namespace"
                  />
                }
                helpText={
                  <FormattedMessage
                    id="xpack.uptime.monitorManagement.namespaceHelpLabel"
                    defaultMessage="Change the default namespace. This setting changes the name of the monitor's data stream. {learnMore}."
                    values={{
                      learnMore: (
                        <EuiLink
                          target="_blank"
                          href={services.docLinks?.links?.fleet?.datastreamsNamingScheme}
                          external
                        >
                          <FormattedMessage
                            id="xpack.uptime.monitorManagement.namespaceHelpLearnMoreLabel"
                            defaultMessage="Learn More"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                }
              >
                <EuiFieldText
                  autoFocus={true}
                  defaultValue={namespace}
                  required={true}
                  isInvalid={isNamespaceInvalid}
                  fullWidth={true}
                  name="namespace"
                  onChange={(event) => setNamespace(event.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
      <ServiceLocations
        setLocations={setLocations}
        selectedLocations={locations}
        isInvalid={isLocationsInvalid}
      />
    </>
  );
};
