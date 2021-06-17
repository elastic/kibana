/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_SEVERITY_LEVEL } from '@kbn/rule-data-utils/target/technical_field_names';
import { ValuesType } from 'utility-types';
import { EuiTheme } from '../../../../../../../../src/plugins/kibana_react/common';
import { ObservabilityRuleTypeRegistry } from '../../../../../../observability/public';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { getAlertAnnotations } from './get_alert_annotations';

type Alert = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/alerts'>['alerts']
>;

const euiColorDanger = 'red';
const euiColorWarning = 'yellow';
const theme = ({
  eui: { euiColorDanger, euiColorWarning },
} as unknown) as EuiTheme;
const alert: Alert = {
  'rule.id': ['apm.transaction_duration'],
  'kibana.rac.alert.evaluation.value': [2057657.39],
  'service.name': ['frontend-rum'],
  'rule.name': ['Latency threshold | frontend-rum'],
  'kibana.rac.alert.duration.us': [62879000],
  'kibana.rac.alert.status': ['open'],
  tags: ['apm', 'service.name:frontend-rum'],
  'transaction.type': ['page-load'],
  'kibana.rac.alert.producer': ['apm'],
  'kibana.rac.alert.uuid': ['af2ae371-df79-4fca-b0eb-a2dbd9478180'],
  'rule.uuid': ['82e0ee40-c2f4-11eb-9a42-a9da66a1722f'],
  'event.action': ['active'],
  '@timestamp': ['2021-06-01T16:16:05.183Z'],
  'kibana.rac.alert.id': ['apm.transaction_duration_All'],
  'processor.event': ['transaction'],
  'kibana.rac.alert.evaluation.threshold': [500000],
  'kibana.rac.alert.start': ['2021-06-01T16:15:02.304Z'],
  'event.kind': ['state'],
  'rule.category': ['Latency threshold'],
};
const chartStartTime = new Date(
  alert['kibana.rac.alert.start']![0] as string
).getTime();
const getFormatter: ObservabilityRuleTypeRegistry['getFormatter'] = () => () => ({
  link: '/',
  reason: 'a good reason',
});
const selectedAlertId = undefined;
const setSelectedAlertId = jest.fn();

describe('getAlertAnnotations', () => {
  describe('with no alerts', () => {
    it('returns an empty array', () => {
      expect(
        getAlertAnnotations({
          alerts: [],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })
      ).toEqual([]);
    });
  });

  describe('with an alert with an undefined severity', () => {
    it('uses the danger color', () => {
      expect(
        getAlertAnnotations({
          alerts: [alert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.style.line.stroke
      ).toEqual(euiColorDanger);
    });

    it('says "Alert" in the header', () => {
      expect(
        getAlertAnnotations({
          alerts: [alert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.dataValues[0].header
      ).toEqual('Alert');
    });

    it('uses the reason in the annotation details', () => {
      expect(
        getAlertAnnotations({
          alerts: [alert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.dataValues[0].details
      ).toEqual('a good reason');
    });

    describe('with no formatter', () => {
      it('uses the rule type', () => {
        const getNoFormatter: ObservabilityRuleTypeRegistry['getFormatter'] = () =>
          undefined;

        expect(
          getAlertAnnotations({
            alerts: [alert],
            chartStartTime,
            getFormatter: getNoFormatter,
            selectedAlertId,
            setSelectedAlertId,
            theme,
          })![0].props.dataValues[0].details
        ).toEqual(alert['rule.name']![0]);
      });
    });

    describe('when the alert start time is before the chart start time', () => {
      it('uses the chart start time', () => {
        const beforeChartStartTime = 1622565000000;

        expect(
          getAlertAnnotations({
            alerts: [alert],
            chartStartTime: beforeChartStartTime,
            getFormatter,
            selectedAlertId,
            setSelectedAlertId,
            theme,
          })![0].props.dataValues[0].dataValue
        ).toEqual(beforeChartStartTime);
      });
    });
  });

  describe('with an alert with a warning severity', () => {
    const warningAlert: Alert = {
      ...alert,
      [ALERT_SEVERITY_LEVEL]: ['warning'],
    };

    it('uses the warning color', () => {
      expect(
        getAlertAnnotations({
          alerts: [warningAlert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.style.line.stroke
      ).toEqual(euiColorWarning);
    });

    it('says "Warning Alert" in the header', () => {
      expect(
        getAlertAnnotations({
          alerts: [warningAlert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.dataValues[0].header
      ).toEqual('Warning Alert');
    });
  });

  describe('with an alert with a critical severity', () => {
    const criticalAlert: Alert = {
      ...alert,
      [ALERT_SEVERITY_LEVEL]: ['critical'],
    };

    it('uses the critical color', () => {
      expect(
        getAlertAnnotations({
          alerts: [criticalAlert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.style.line.stroke
      ).toEqual(euiColorDanger);
    });

    it('says "Critical Alert" in the header', () => {
      expect(
        getAlertAnnotations({
          alerts: [criticalAlert],
          chartStartTime,
          getFormatter,
          selectedAlertId,
          setSelectedAlertId,
          theme,
        })![0].props.dataValues[0].header
      ).toEqual('Critical Alert');
    });
  });
});
