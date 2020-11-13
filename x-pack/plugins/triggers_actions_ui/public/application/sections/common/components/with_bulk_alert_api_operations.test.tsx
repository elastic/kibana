/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { shallow, mount } from 'enzyme';
import uuid from 'uuid';
import { withBulkAlertOperations, ComponentOpts } from './with_bulk_alert_api_operations';
import * as alertApi from '../../../lib/alert_api';
import { useAppDependencies } from '../../../app_context';
import { Alert } from '../../../../types';

jest.mock('../../../lib/alert_api');

jest.mock('../../../app_context', () => {
  const http = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({
      http,
      legacy: {
        capabilities: {
          get: jest.fn(() => ({})),
        },
      },
    })),
  };
});

describe('with_bulk_alert_api_operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends any component with AlertApi methods', () => {
    const ComponentToExtend = (props: ComponentOpts) => {
      expect(typeof props.muteAlerts).toEqual('function');
      expect(typeof props.unmuteAlerts).toEqual('function');
      expect(typeof props.enableAlerts).toEqual('function');
      expect(typeof props.disableAlerts).toEqual('function');
      expect(typeof props.deleteAlerts).toEqual('function');
      expect(typeof props.muteAlert).toEqual('function');
      expect(typeof props.unmuteAlert).toEqual('function');
      expect(typeof props.enableAlert).toEqual('function');
      expect(typeof props.disableAlert).toEqual('function');
      expect(typeof props.deleteAlert).toEqual('function');
      expect(typeof props.loadAlert).toEqual('function');
      expect(typeof props.loadAlertTypes).toEqual('function');
      return <div />;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    expect(shallow(<ExtendedComponent />).type()).toEqual(ComponentToExtend);
  });

  // single alert
  it('muteAlert calls the muteAlert api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ muteAlert, alert }: ComponentOpts & { alert: Alert }) => {
      return <button onClick={() => muteAlert(alert)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alert = mockAlert();
    const component = mount(<ExtendedComponent alert={alert} />);
    component.find('button').simulate('click');

    expect(alertApi.muteAlert).toHaveBeenCalledTimes(1);
    expect(alertApi.muteAlert).toHaveBeenCalledWith({ id: alert.id, http });
  });

  it('unmuteAlert calls the unmuteAlert api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ unmuteAlert, alert }: ComponentOpts & { alert: Alert }) => {
      return <button onClick={() => unmuteAlert(alert)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alert = mockAlert({ muteAll: true });
    const component = mount(<ExtendedComponent alert={alert} />);
    component.find('button').simulate('click');

    expect(alertApi.unmuteAlert).toHaveBeenCalledTimes(1);
    expect(alertApi.unmuteAlert).toHaveBeenCalledWith({ id: alert.id, http });
  });

  it('enableAlert calls the muteAlerts api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ enableAlert, alert }: ComponentOpts & { alert: Alert }) => {
      return <button onClick={() => enableAlert(alert)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alert = mockAlert({ enabled: false });
    const component = mount(<ExtendedComponent alert={alert} />);
    component.find('button').simulate('click');

    expect(alertApi.enableAlert).toHaveBeenCalledTimes(1);
    expect(alertApi.enableAlert).toHaveBeenCalledWith({ id: alert.id, http });
  });

  it('disableAlert calls the disableAlert api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ disableAlert, alert }: ComponentOpts & { alert: Alert }) => {
      return <button onClick={() => disableAlert(alert)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alert = mockAlert();
    const component = mount(<ExtendedComponent alert={alert} />);
    component.find('button').simulate('click');

    expect(alertApi.disableAlert).toHaveBeenCalledTimes(1);
    expect(alertApi.disableAlert).toHaveBeenCalledWith({ id: alert.id, http });
  });

  it('deleteAlert calls the deleteAlert api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ deleteAlert, alert }: ComponentOpts & { alert: Alert }) => {
      return <button onClick={() => deleteAlert(alert)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alert = mockAlert();
    const component = mount(<ExtendedComponent alert={alert} />);
    component.find('button').simulate('click');

    expect(alertApi.deleteAlerts).toHaveBeenCalledTimes(1);
    expect(alertApi.deleteAlerts).toHaveBeenCalledWith({ ids: [alert.id], http });
  });

  // bulk alerts
  it('muteAlerts calls the muteAlerts api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ muteAlerts, alerts }: ComponentOpts & { alerts: Alert[] }) => {
      return <button onClick={() => muteAlerts(alerts)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alerts = [mockAlert(), mockAlert()];
    const component = mount(<ExtendedComponent alerts={alerts} />);
    component.find('button').simulate('click');

    expect(alertApi.muteAlerts).toHaveBeenCalledTimes(1);
    expect(alertApi.muteAlerts).toHaveBeenCalledWith({ ids: [alerts[0].id, alerts[1].id], http });
  });

  it('unmuteAlerts calls the unmuteAlerts api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ unmuteAlerts, alerts }: ComponentOpts & { alerts: Alert[] }) => {
      return <button onClick={() => unmuteAlerts(alerts)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alerts = [mockAlert({ muteAll: true }), mockAlert({ muteAll: true })];
    const component = mount(<ExtendedComponent alerts={alerts} />);
    component.find('button').simulate('click');

    expect(alertApi.unmuteAlerts).toHaveBeenCalledTimes(1);
    expect(alertApi.unmuteAlerts).toHaveBeenCalledWith({ ids: [alerts[0].id, alerts[1].id], http });
  });

  it('enableAlerts calls the muteAlertss api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ enableAlerts, alerts }: ComponentOpts & { alerts: Alert[] }) => {
      return <button onClick={() => enableAlerts(alerts)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alerts = [
      mockAlert({ enabled: false }),
      mockAlert({ enabled: true }),
      mockAlert({ enabled: false }),
    ];
    const component = mount(<ExtendedComponent alerts={alerts} />);
    component.find('button').simulate('click');

    expect(alertApi.enableAlerts).toHaveBeenCalledTimes(1);
    expect(alertApi.enableAlerts).toHaveBeenCalledWith({ ids: [alerts[0].id, alerts[2].id], http });
  });

  it('disableAlerts calls the disableAlerts api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ disableAlerts, alerts }: ComponentOpts & { alerts: Alert[] }) => {
      return <button onClick={() => disableAlerts(alerts)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alerts = [mockAlert(), mockAlert()];
    const component = mount(<ExtendedComponent alerts={alerts} />);
    component.find('button').simulate('click');

    expect(alertApi.disableAlerts).toHaveBeenCalledTimes(1);
    expect(alertApi.disableAlerts).toHaveBeenCalledWith({
      ids: [alerts[0].id, alerts[1].id],
      http,
    });
  });

  it('deleteAlerts calls the deleteAlerts api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ deleteAlerts, alerts }: ComponentOpts & { alerts: Alert[] }) => {
      return <button onClick={() => deleteAlerts(alerts)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alerts = [mockAlert(), mockAlert()];
    const component = mount(<ExtendedComponent alerts={alerts} />);
    component.find('button').simulate('click');

    expect(alertApi.deleteAlerts).toHaveBeenCalledTimes(1);
    expect(alertApi.deleteAlerts).toHaveBeenCalledWith({ ids: [alerts[0].id, alerts[1].id], http });
  });

  it('loadAlert calls the loadAlert api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({
      loadAlert,
      alertId,
    }: ComponentOpts & { alertId: Alert['id'] }) => {
      return <button onClick={() => loadAlert(alertId)}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const alertId = uuid.v4();
    const component = mount(<ExtendedComponent alertId={alertId} />);
    component.find('button').simulate('click');

    expect(alertApi.loadAlert).toHaveBeenCalledTimes(1);
    expect(alertApi.loadAlert).toHaveBeenCalledWith({ alertId, http });
  });

  it('loadAlertTypes calls the loadAlertTypes api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ loadAlertTypes }: ComponentOpts) => {
      return <button onClick={() => loadAlertTypes()}>{'call api'}</button>;
    };

    const ExtendedComponent = withBulkAlertOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(alertApi.loadAlertTypes).toHaveBeenCalledTimes(1);
    expect(alertApi.loadAlertTypes).toHaveBeenCalledWith({ http });
  });
});

function mockAlert(overloads: Partial<Alert> = {}): Alert {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `alert-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}
