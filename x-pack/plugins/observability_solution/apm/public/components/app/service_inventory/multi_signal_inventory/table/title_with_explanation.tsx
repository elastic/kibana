/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiIcon, EuiText } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { css } from '@emotion/react';

interface Props {
  name?: string;
  description: ReactElement | string;
  formula: string;
  'data-test-subj'?: string;
}

function TitleWithPopoverExplanation(props: Props) {
  const { name, description, formula } = props;
  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  return (
    <>
      {name && <>{name}</>}
      <EuiPopover
        panelPaddingSize="s"
        focusTrapProps={{
          returnFocus: false,
        }}
        button={
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePopover();
            }}
            css={css`
              display: flex;
            `}
            data-test-subj={props['data-test-subj']}
          >
            <EuiIcon type="questionInCircle" />
          </button>
        }
        isOpen={isPopoverOpen}
        offset={10}
        closePopover={closePopover}
        repositionOnScroll
        anchorPosition="upCenter"
        panelStyle={{ maxWidth: 350 }}
      >
        <EuiText size="xs">
          <p>{description}</p>
          <p>
            <strong>
              <FormattedMessage
                id="xpack.apm.multiSignal.tooltip.formula"
                defaultMessage="Formula Calculation:"
              />
            </strong>
            <br />
            <code
              css={css`
                word-break: break-word;
              `}
            >
              {formula}
            </code>
          </p>
        </EuiText>
      </EuiPopover>
    </>
  );
}

interface ExplanationProps {
  includeTitle: boolean;
}

export function LogRateWithExplanation({ includeTitle }: ExplanationProps) {
  return (
    <TitleWithPopoverExplanation
      name={
        includeTitle
          ? i18n.translate('xpack.apm.multiSignal.servicesTable.logRatePerMinute', {
              defaultMessage: 'Log rate (per min.)',
            })
          : undefined
      }
      description={
        <FormattedMessage
          defaultMessage="Rate of logs per minute observed for given {serviceName}."
          id="xpack.apm.multiSignal.servicesTable.logRatePerMinute.tooltip.description"
          values={{
            serviceName: (
              <code
                css={css`
                  word-break: break-word;
                `}
              >
                {i18n.translate(
                  'xpack.apm.multiSignal.servicesTable.logRatePerMinute.tooltip.serviceNameLabel',
                  {
                    defaultMessage: 'service.name',
                  }
                )}
              </code>
            ),
          }}
        />
      }
      formula="count(kql='log.level: * OR error.log.level: *')"
      data-test-subj={
        includeTitle ? 'apmMultiSignalLogRateColumnTooltip' : 'apmMultiSignalLogRateChartTooltip'
      }
    />
  );
}

export function LogErrorRateWithExplanation({ includeTitle }: ExplanationProps) {
  return (
    <TitleWithPopoverExplanation
      name={
        includeTitle
          ? i18n.translate('xpack.apm.multiSignal.servicesTable.logErrorRate', {
              defaultMessage: 'Log error rate',
            })
          : undefined
      }
      description={
        <FormattedMessage
          defaultMessage="% of logs where error detected for given {serviceName}."
          id="xpack.apm.multiSignal.servicesTable.logErrorRate.tooltip.description"
          values={{
            serviceName: (
              <code
                css={css`
                  word-break: break-word;
                `}
              >
                {i18n.translate(
                  'xpack.apm.multiSignal.servicesTable.logErrorRate.tooltip.serviceNameLabel',
                  {
                    defaultMessage: 'service.name',
                  }
                )}
              </code>
            ),
          }}
        />
      }
      formula={`count(kql='log.level: "error" OR log.level: "ERROR" OR  error.log.level: "error" OR error.log.level: "ERROR"') / count(kql='log.level: * OR error.log.level: *')`}
      data-test-subj={
        includeTitle
          ? 'apmMultiSignalLogErrorRateColumnTooltip'
          : 'apmMultiSignalLogErrorRateChartTooltip'
      }
    />
  );
}
