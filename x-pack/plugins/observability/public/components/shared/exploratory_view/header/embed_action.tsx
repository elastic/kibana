/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover, EuiCodeBlock, EuiPopoverTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { ObservabilityAppServices } from '../../../../application/types';

export interface AddToCaseProps {
  appId?: 'securitySolutionUI' | 'observability';
  autoOpen?: boolean;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
  owner?: string;
  setAutoOpen?: (val: boolean) => void;
  timeRange: { from: string; to: string };
}

export function EmbedAction() {
  const kServices = useKibana<ObservabilityAppServices>().services;

  const [isOpen, setIsOpen] = useState(false);

  const { reportType, allSeries } = useSeriesStorage();

  const {
    application: { getUrlForApp },
  } = kServices;

  const button = (
    <EuiButtonEmpty
      size="s"
      isDisabled={lensAttributes === null}
      onClick={() => {
        setIsOpen(!isOpen);
      }}
    >
      {i18n.translate('xpack.observability.expView.heading.addToCase', {
        defaultMessage: 'Embed <></>',
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={() => setIsOpen(false)}>
      <EuiPopoverTitle>Embed Exploratory view (Dev only feature)</EuiPopoverTitle>
      <EuiCodeBlock
        language="jsx"
        fontSize="m"
        paddingSize="m"
        isCopyable={true}
        style={{ width: 500 }}
      >
        {`const { observability } = useKibana<>().services;

const { ExploratoryViewEmbeddable } = observability;

<ExploratoryViewEmbeddable
        customHeight={'300px'}
        reportType="${reportType}"
        attributes={${JSON.stringify(allSeries, null, 2)}}
 />
        `}
      </EuiCodeBlock>
    </EuiPopover>
  );
}
