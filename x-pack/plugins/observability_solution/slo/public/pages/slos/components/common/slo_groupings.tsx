/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiAccordion,
  EuiButtonEmpty,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  direction?: 'column' | 'row';
  truncate?: boolean;
}

export function SLOGroupings({ slo, direction = 'row', truncate = true }: Props) {
  const groups = Object.entries(slo?.groupings || []);
  const shouldTruncate = truncate && groups.length > 3;
  const firstThree = shouldTruncate ? groups.slice(0, 3) : groups;
  const rest = shouldTruncate ? groups.slice(3, groups.length) : [];

  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  if (!groups.length) {
    return null;
  }

  return (
    <>
      {shouldTruncate ? (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiAccordion
              id="sloGroupingsAccordion"
              arrowDisplay="right"
              buttonElement="div"
              buttonProps={{ css: buttonCss }}
              buttonContent={
                <>
                  <EuiFlexGroup
                    alignItems={direction === 'column' ? 'flexStart' : 'center'}
                    gutterSize="s"
                    direction={direction}
                  >
                    <EuiFlexItem>
                      <Entries entries={firstThree} direction={direction} />{' '}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {rest.length && (
                        <span>
                          <EuiButtonEmpty data-test-subj="accordion" flush="left">
                            {`(${i18n.translate('xpack.slo.andLabel', {
                              defaultMessage:
                                'and {count, plural, one {# more instance} other {# more instances}}',
                              values: {
                                count: rest.length,
                              },
                            })})`}
                          </EuiButtonEmpty>
                        </span>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              }
            >
              <Entries entries={rest} direction={direction} />
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <Entries entries={truncate ? firstThree : groups} direction={direction} />
      )}
    </>
  );
}

function Entries({
  entries,
  direction,
}: {
  entries: Array<[string, unknown]>;
  direction: 'row' | 'column';
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="s" direction={direction}>
      {entries.map(([key, value]) => (
        <EuiFlexItem grow={false} key={key}>
          <EuiText size="s">
            <span>
              {`${key}: `}
              <EuiCopy textToCopy={`${value}`}>
                {(copy) => (
                  <EuiLink
                    data-test-subj="sloInstanceCopy"
                    style={{
                      fontWeight: euiTheme.font.weight.semiBold,
                    }}
                    color="text"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      copy();
                    }}
                  >
                    {`${value}`}
                  </EuiLink>
                )}
              </EuiCopy>
            </span>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
