/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, render, act } from '@testing-library/react';

import { AlertSummaryView } from './alert_summary_view';
import { mockAlertDetailsData } from './__mocks__';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

import { TestProviders, TestProvidersComponent } from '../../mock';
import { TimelineId } from '../../../../common/types';
import { mockBrowserFields } from '../../containers/source/mock';
import * as i18n from './translations';

jest.mock('../../lib/kibana');

jest.mock('../../../detection_engine/rule_management/logic/use_rule_with_fallback', () => {
  return {
    useRuleWithFallback: jest.fn(),
  };
});

const props = {
  data: mockAlertDetailsData as TimelineEventsDetailsItem[],
  browserFields: mockBrowserFields,
  eventId: '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31',
  timelineId: 'detections-page',
  title: '',
  goToTable: jest.fn(),
};

describe('AlertSummaryView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      rule: {
        note: 'investigation guide',
      },
    });
  });
  test('render correct items', async () => {
    await act(async () => {
      const { getByTestId } = render(
        <TestProviders>
          <AlertSummaryView {...props} />
        </TestProviders>
      );
      expect(getByTestId('summary-view')).toBeInTheDocument();
    });
  });

  test('it renders the action cell by default', async () => {
    await act(async () => {
      const { getAllByTestId } = render(
        <TestProviders>
          <AlertSummaryView {...props} />
        </TestProviders>
      );
      expect(getAllByTestId('hover-actions-filter-for').length).toBeGreaterThan(0);
    });
  });

  test('Renders the correct global fields', async () => {
    await act(async () => {
      const { getByText } = render(
        <TestProviders>
          <AlertSummaryView {...props} />
        </TestProviders>
      );

      ['host.name', 'user.name', i18n.RULE_TYPE, 'query', 'rule.name'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('it does NOT render the action cell for the active timeline', async () => {
    await act(async () => {
      const { queryAllByTestId } = render(
        <TestProviders>
          <AlertSummaryView {...props} timelineId={TimelineId.active} />
        </TestProviders>
      );
      expect(queryAllByTestId('hover-actions-filter-for').length).toEqual(0);
    });
  });

  test('it does NOT render the action cell when readOnly is passed', async () => {
    await act(async () => {
      const { queryAllByTestId } = render(
        <TestProviders>
          <AlertSummaryView {...{ ...props, isReadOnly: true }} />
        </TestProviders>
      );
      expect(queryAllByTestId('hover-actions-filter-for').length).toEqual(0);
    });
  });

  test("render no investigation guide if it doesn't exist", async () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      rule: {
        note: null,
      },
    });
    await act(async () => {
      const { queryByTestId } = render(
        <TestProviders>
          <AlertSummaryView {...props} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(queryByTestId('summary-view-guide')).not.toBeInTheDocument();
      });
    });
  });
  test('Network event renders the correct summary rows', async () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.category') {
          return {
            ...item,
            values: ['network'],
            originalValue: ['network'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );

      [
        'host.name',
        'user.name',
        'destination.address',
        'source.address',
        'source.port',
        'process.name',
      ].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('DNS network event renders the correct summary rows', async () => {
    const renderProps = {
      ...props,
      data: [
        ...(mockAlertDetailsData.map((item) => {
          if (item.category === 'event' && item.field === 'event.category') {
            return {
              ...item,
              values: ['network'],
              originalValue: ['network'],
            };
          }
          return item;
        }) as TimelineEventsDetailsItem[]),
        {
          category: 'dns',
          field: 'dns.question.name',
          values: ['www.example.com'],
          originalValue: ['www.example.com'],
        } as TimelineEventsDetailsItem,
      ],
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );

      ['dns.question.name', 'process.name'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Memory event code renders additional summary rows', async () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            ...item,
            values: ['shellcode_thread'],
            originalValue: ['shellcode_thread'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['host.name', 'user.name', 'Target.process.executable'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });
  test('Behavior event code renders additional summary rows', async () => {
    const actualRuleDescription = 'The actual rule description';
    const renderProps = {
      ...props,
      data: [
        ...mockAlertDetailsData.map((item) => {
          if (item.category === 'event' && item.field === 'event.code') {
            return {
              ...item,
              values: ['behavior'],
              originalValue: ['behavior'],
            };
          }
          if (item.category === 'event' && item.field === 'event.category') {
            return {
              ...item,
              values: ['malware', 'process', 'file'],
              originalValue: ['malware', 'process', 'file'],
            };
          }
          return item;
        }),
        {
          category: 'rule',
          field: 'rule.description',
          values: [actualRuleDescription],
          originalValue: [actualRuleDescription],
        },
      ] as TimelineEventsDetailsItem[],
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['host.name', 'user.name', 'process.name', actualRuleDescription].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Malware event category shows file fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.category') {
          return {
            ...item,
            values: ['malware'],
            originalValue: ['malware'],
          };
        }
        return item;
      }),
      { category: 'file', field: 'file.name', values: ['malware.exe'] },
      {
        category: 'file',
        field: 'file.hash.sha256',
        values: ['3287rhf3847gb38fb3o984g9384g7b3b847gb'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['host.name', 'user.name', 'file.name', 'file.hash.sha256'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Ransomware event code shows correct fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            ...item,
            values: ['ransomware'],
            originalValue: ['ransomware'],
          };
        }
        return item;
      }),
      { category: 'Ransomware', field: 'Ransomware.feature', values: ['mbr'] },
      {
        category: 'process',
        field: 'process.hash.sha256',
        values: ['3287rhf3847gb38fb3o984g9384g7b3b847gb'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['process.hash.sha256', 'Ransomware.feature'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Machine learning events show correct fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['machine_learning'],
            originalValue: ['machine_learning'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.rule.parameters.machine_learning_job_id',
        values: ['i_am_the_ml_job_id'],
      },
      { category: 'kibana', field: 'kibana.alert.rule.parameters.anomaly_threshold', values: [2] },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['i_am_the_ml_job_id', 'kibana.alert.rule.parameters.anomaly_threshold'].forEach(
        (fieldId) => {
          expect(getByText(fieldId));
        }
      );
    });
  });

  test('[legacy] Machine learning events show correct fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['machine_learning'],
            originalValue: ['machine_learning'],
          };
        }
        return item;
      }),
      {
        category: 'signal',
        field: 'signal.rule.machine_learning_job_id',
        values: ['i_am_the_ml_job_id'],
      },
      { category: 'signal', field: 'signal.rule.anomaly_threshold', values: [2] },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['i_am_the_ml_job_id', 'signal.rule.anomaly_threshold'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Threat match events show correct fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['threat_match'],
            originalValue: ['threat_match'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.rule.parameters.threat_index',
        values: ['threat_index*'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.rule.parameters.threat_query',
        values: ['*query*'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['threat_index*', '*query*'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('[legacy] Threat match events show correct fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['threat_match'],
            originalValue: ['threat_match'],
          };
        }
        return item;
      }),
      {
        category: 'signal',
        field: 'signal.rule.threat_index',
        values: ['threat_index*'],
      },
      {
        category: 'signal',
        field: 'signal.rule.threat_query',
        values: ['*query*'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['threat_index*', '*query*'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Ransomware event code resolves fields from the source event', async () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            ...item,
            values: ['ransomware'],
            originalValue: ['ransomware'],
          };
        }
        if (item.category === 'event' && item.field === 'event.category') {
          return {
            ...item,
            values: ['malware', 'process', 'file'],
            originalValue: ['malware', 'process', 'file'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );
      ['host.name', 'user.name', 'process.name'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Threshold events have special fields', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['threshold'],
            originalValue: ['threshold'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.count',
        values: [9001],
        originalValue: [9001],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.terms.value',
        values: ['host-23084y2', '3084hf3n84p8934r8h'],
        originalValue: ['host-23084y2', '3084hf3n84p8934r8h'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.terms.field',
        values: ['host.name', 'host.id'],
        originalValue: ['host.name', 'host.id'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.cardinality.field',
        values: ['host.name'],
        originalValue: ['host.name'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.cardinality.value',
        values: [9001],
        originalValue: [9001],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );

      ['Event Count', 'Event Cardinality', 'host.name', 'host.id'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });
    });
  });

  test('Threshold fields are not shown when data is malformated', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['threshold'],
            originalValue: ['threshold'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.count',
        values: [9001],
        originalValue: [9001],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.terms.field',
        // This would be expected to have two entries
        values: ['host.id'],
        originalValue: ['host.id'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.terms.value',
        values: ['host-23084y2', '3084hf3n84p8934r8h'],
        originalValue: ['host-23084y2', '3084hf3n84p8934r8h'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.cardinality.field',
        values: ['host.name'],
        originalValue: ['host.name'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.cardinality.value',
        // This would be expected to have one entry
        values: [],
        originalValue: [],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );

      ['Event Count'].forEach((fieldId) => {
        expect(getByText(fieldId));
      });

      [
        'host.name [threshold]',
        'host.id [threshold]',
        'Event Cardinality',
        'count(host.name) >= 9001',
      ].forEach((fieldText) => {
        expect(() => getByText(fieldText)).toThrow();
      });
    });
  });

  test('Threshold fields are not shown when data is partially missing', async () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['threshold'],
            originalValue: ['threshold'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.terms.field',
        // This would be expected to have two entries
        values: ['host.id'],
        originalValue: ['host.id'],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.cardinality.field',
        values: ['host.name'],
        originalValue: ['host.name'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    await act(async () => {
      const { getByText } = render(
        <TestProvidersComponent>
          <AlertSummaryView {...renderProps} />
        </TestProvidersComponent>
      );

      //  The `value` fields are missing here, so the enriched field info cannot be calculated correctly
      ['host.id [threshold]', 'Threshold Cardinality', 'count(host.name) >= 9001'].forEach(
        (fieldText) => {
          expect(() => getByText(fieldText)).toThrow();
        }
      );
    });
  });

  test('New terms events have special fields', () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['new_terms'],
            originalValue: ['new_terms'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.new_terms',
        values: ['127.0.0.1'],
        originalValue: ['127.0.0.1'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    const { getByText } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );

    ['New Terms'].forEach((fieldId) => {
      expect(getByText(fieldId));
    });
  });

  test("doesn't render empty fields", async () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.name') {
          return {
            category: 'kibana',
            field: 'kibana.alert.rule.name',
            values: undefined,
            originalValue: undefined,
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };

    await act(async () => {
      const { queryByTestId } = render(
        <TestProviders>
          <AlertSummaryView {...renderProps} />
        </TestProviders>
      );

      expect(queryByTestId('event-field-kibana.alert.rule.name')).not.toBeInTheDocument();
    });
  });
});
