/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiLoadingContent } from '@elastic/eui';
import { createGlobalStyle } from 'styled-components';
import { useFetchStatus } from '../fleet_integration/use_fetch_status';
import {
  MISSING_KIBANA_PRIVILLEGES,
  NOT_AVAILABLE,
  PERMISSION_DENIED,
  SHORT_EMPTY_TITLE,
} from '../shared_components/osquery_action/translations';

// Osquery connector has an additional validation, but no real Settings
// thus we hide all the fields besides the Osquery validation message
const OverwriteGlobalStyle = createGlobalStyle`
  .actConnectorModal {
    h4.euiTitle, .euiSpacer {
      display: none
    }

    .euiFormRow, .euiModalFooter {
      display: ${(props: { hidden: boolean }) => (props.hidden ? 'none' : 'inherit')}
    }
  }

`;
const OsqueryConnectorForm: React.FunctionComponent<{}> = () => {
  const { loading, disabled, permissionDenied } = useFetchStatus();

  const renderError = useMemo(() => {
    if (loading) {
      return <EuiLoadingContent lines={5} />;
    }

    if (permissionDenied) {
      return (
        <EuiEmptyPrompt
          title={<h2>{PERMISSION_DENIED}</h2>}
          titleSize="xs"
          body={MISSING_KIBANA_PRIVILLEGES}
        />
      );
    }

    if (disabled) {
      return (
        <EuiEmptyPrompt
          title={<h2>{SHORT_EMPTY_TITLE}</h2>}
          titleSize="xs"
          body={<p>{NOT_AVAILABLE}</p>}
        />
      );
    }

    return null;
  }, [disabled, loading, permissionDenied]);

  return (
    <>
      <OverwriteGlobalStyle hidden={disabled || permissionDenied} />
      {renderError}
    </>
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { OsqueryConnectorForm as default };
