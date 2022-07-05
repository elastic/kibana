/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UseFormReturn, ControllerRenderProps } from 'react-hook-form';
import {
  EuiButtonGroup,
  EuiCheckbox,
  EuiCode,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiComboBoxProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSelect,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiLink,
  EuiTextArea,
} from '@elastic/eui';
import { useMonitorName } from '../fields/use_monitor_name';
import { MonitorTypeRadioGroup } from '../fields/monitor_type_radio_group';
import {
  ConfigKey,
  DataStream,
  FormMonitorType,
  HTTPMethod,
  MonitorFields,
  MonitorServiceLocations,
  ScreenshotOption,
  ServiceLocations,
  TLSVersion,
  VerificationMode,
  FieldMeta,
} from '../types';
import { DEFAULT_BROWSER_ADVANCED_FIELDS } from '../constants';
import { HeaderField } from '../fields/header_field';
import { RequestBodyField } from '../fields/request_body_field';
import { ResponseBodyIndexField } from '../fields/index_response_body_field';
import { ComboBox } from '../fields/combo_box';
import { SourceField } from '../fields/source_field';
import { getDefaultFormFields } from './defaults';
import { validate, validateHeaders, WHOLE_NUMBERS_ONLY, FLOATS_ONLY } from './validation';

const getScheduleContent = (value: number) => {
  let unit: string;
  const minutes = i18n.translate('xpack.synthetics.monitorConfig.schedule.unit.minutes', {
    defaultMessage: 'minutes',
  });
  const minute = i18n.translate('xpack.synthetics.monitorConfig.schedule.unit.minute', {
    defaultMessage: 'minute',
  });
  const hours = i18n.translate('xpack.synthetics.monitorConfig.schedule.unit.hours', {
    defaultMessage: 'hours',
  });
  const hour = i18n.translate('xpack.synthetics.monitorConfig.schedule.unit.hour', {
    defaultMessage: 'hour',
  });
  switch (true) {
    case value === 1:
      unit = minute;
      break;
    case value / 60 === 1:
      unit = hour;
      break;
    case value / 60 > 1:
      unit = hours;
      break;
    default:
      unit = minutes;
  }

  return i18n.translate('xpack.synthetics.monitorConfig.schedule.label', {
    defaultMessage: 'Every {number} {unit}',
    values: {
      number: value >= 60 ? value / 60 : value,
      unit,
    },
  });
};

const BROWSER_SCHEDULES = [
  {
    value: '3',
    text: getScheduleContent(3),
  },
  {
    value: '5',
    text: getScheduleContent(5),
  },
  {
    value: '10',
    text: getScheduleContent(10),
  },
  {
    value: '15',
    text: getScheduleContent(15),
  },
  {
    value: '30',
    text: getScheduleContent(30),
  },
  {
    value: '60',
    text: getScheduleContent(60),
  },
  {
    value: '120',
    text: getScheduleContent(120),
  },
  {
    value: '240',
    text: getScheduleContent(240),
  },
];

const LIGHTWEIGHT_SCHEDULES = [
  {
    value: '1',
    text: getScheduleContent(1),
  },
  {
    value: '3',
    text: getScheduleContent(3),
  },
  {
    value: '5',
    text: getScheduleContent(5),
  },
  {
    value: '10',
    text: getScheduleContent(10),
  },
  {
    value: '15',
    text: getScheduleContent(15),
  },
  {
    value: '30',
    text: getScheduleContent(30),
  },
  {
    value: '60',
    text: getScheduleContent(60),
  },
];

export const MONITOR_TYPE_CONFIG = {
  [FormMonitorType.MULTISTEP]: {
    id: 'syntheticsMonitorTypeMultistep',
    'data-test-subj': 'syntheticsMonitorTypeMultistep',
    label: 'Multistep',
    value: FormMonitorType.MULTISTEP,
    descriptionTitle: i18n.translate('xpack.synthetics.monitorConfig.monitorType.multiStep.title', {
      defaultMessage: 'Multistep Browser Journey',
    }),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.monitorType.multiStep.description',
      {
        defaultMessage:
          'Navigate through multiple steps or pages to test key user flows from a real browser.',
      }
    ),
    link: '#',
    icon: 'videoPlayer',
    beta: true,
  },
  [FormMonitorType.SINGLE]: {
    id: 'syntheticsMonitorTypeSingle',
    'data-test-subj': 'syntheticsMonitorTypeSingle',
    label: 'Single Page',
    value: FormMonitorType.SINGLE,
    descriptionTitle: i18n.translate(
      'xpack.synthetics.monitorConfig.monitorType.singlePage.title',
      {
        defaultMessage: 'Single Page Browser Test',
      }
    ),
    description: i18n.translate(
      'xpack.synthetics.monitorConfig.monitorType.singlePage.description',
      {
        defaultMessage:
          'Test a single page load including all objects on the page from a real web browser.',
      }
    ),
    link: '#',
    icon: 'videoPlayer',
    beta: true,
  },
  [FormMonitorType.HTTP]: {
    id: 'syntheticsMonitorTypeHTTP',
    'data-test-subj': 'syntheticsMonitorTypeHTTP',
    label: 'HTTP Ping',
    value: FormMonitorType.HTTP,
    descriptionTitle: i18n.translate('xpack.synthetics.monitorConfig.monitorType.http.title', {
      defaultMessage: 'HTTP Ping',
    }),
    description: i18n.translate('xpack.synthetics.monitorConfig.monitorType.http.description', {
      defaultMessage:
        'A lightweight API check to validate the availability of a web service or endpoint.',
    }),
    link: '#',
    icon: 'online',
    beta: false,
  },
  [FormMonitorType.TCP]: {
    id: 'syntheticsMonitorTypeTCP',
    'data-test-subj': 'syntheticsMonitorTypeTCP',
    label: 'TCP Ping',
    value: FormMonitorType.TCP,
    descriptionTitle: i18n.translate('xpack.synthetics.monitorConfig.monitorType.tcp.title', {
      defaultMessage: 'TCP Ping',
    }),
    description: i18n.translate('xpack.synthetics.monitorConfig.monitorType.tcp.description', {
      defaultMessage:
        'A lightweight API check to validate the availability of a web service or endpoint.',
    }),
    link: '#',
    icon: 'online',
    beta: false,
  },
  [FormMonitorType.ICMP]: {
    id: 'syntheticsMonitorTypeICMP',
    'data-test-subj': 'syntheticsMonitorTypeICMP',
    label: 'ICMP Ping',
    value: FormMonitorType.ICMP,
    descriptionTitle: i18n.translate('xpack.synthetics.monitorConfig.monitorType.icmp.title', {
      defaultMessage: 'ICMP Ping',
    }),
    description: i18n.translate('xpack.synthetics.monitorConfig.monitorType.icmp.description', {
      defaultMessage:
        'A lightweight API check to validate the availability of a web service or endpoint.',
    }),
    link: '#',
    icon: 'online',
    beta: false,
  },
};

export const FIELD: Record<string, FieldMeta> = {
  [ConfigKey.FORM_MONITOR_TYPE]: {
    fieldKey: ConfigKey.FORM_MONITOR_TYPE,
    required: true,
    component: MonitorTypeRadioGroup,
    ariaLabel: i18n.translate('xpack.synthetics.monitorConfig.monitorType.label', {
      defaultMessage: 'Monitor type',
    }),
    controlled: true,
    props: ({ field, reset, space }) => ({
      onChange: (_: string, monitorType: FormMonitorType) => {
        const defaultFields = getDefaultFormFields(space)[monitorType];
        reset(defaultFields);
      },
      selectedOption: field?.value,
      options: Object.values(MONITOR_TYPE_CONFIG),
    }),
    validation: () => ({
      required: true,
    }),
  },
  [`${ConfigKey.URLS}__single`]: {
    fieldKey: ConfigKey.URLS,
    required: true,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.urlsSingle.label', {
      defaultMessage: 'Website URL',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.urlsSingle.helpText', {
      defaultMessage: 'For example, https://www.elastic.co.',
    }),
    controlled: true,
    dependencies: [ConfigKey.NAME],
    props: ({ setValue, dependenciesFieldMeta, isEdit }) => {
      return {
        'data-test-subj': 'syntheticsMonitorConfigURL',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(ConfigKey.URLS, event.target.value);
          if (!dependenciesFieldMeta[ConfigKey.NAME].isDirty && !isEdit) {
            setValue(ConfigKey.NAME, event.target.value);
          }
        },
      };
    },
  },
  [`${ConfigKey.URLS}__http`]: {
    fieldKey: ConfigKey.URLS,
    required: true,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.urls.label', {
      defaultMessage: 'URL',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.urls.helpText', {
      defaultMessage: 'For example, your service endpoint.',
    }),
    controlled: true,
    dependencies: [ConfigKey.NAME],
    props: ({ setValue, dependenciesFieldMeta, isEdit }) => {
      return {
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(ConfigKey.URLS, event.target.value);
          if (!dependenciesFieldMeta[ConfigKey.NAME].isDirty && !isEdit) {
            setValue(ConfigKey.NAME, event.target.value);
          }
        },
        'data-test-subj': 'syntheticsMonitorConfigURL',
      };
    },
  },
  [`${ConfigKey.HOSTS}__tcp`]: {
    fieldKey: ConfigKey.HOSTS,
    required: true,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.hostsTCP.label', {
      defaultMessage: 'Host:Port',
    }),
    controlled: true,
    dependencies: [ConfigKey.NAME],
    props: ({ setValue, dependenciesFieldMeta, isEdit }) => {
      return {
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(ConfigKey.HOSTS, event.target.value);
          if (!dependenciesFieldMeta[ConfigKey.NAME].isDirty && !isEdit) {
            setValue(ConfigKey.NAME, event.target.value);
          }
        },
        'data-test-subj': 'syntheticsMonitorConfigHost',
      };
    },
  },
  [`${ConfigKey.HOSTS}__icmp`]: {
    fieldKey: ConfigKey.HOSTS,
    required: true,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.hostsICMP.label', {
      defaultMessage: 'Host',
    }),
    controlled: true,
    dependencies: [ConfigKey.NAME],
    props: ({ setValue, dependenciesFieldMeta, isEdit }) => {
      return {
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(ConfigKey.HOSTS, event.target.value);
          if (!dependenciesFieldMeta[ConfigKey.NAME].isDirty && !isEdit) {
            setValue(ConfigKey.NAME, event.target.value);
          }
        },
        'data-test-subj': 'syntheticsMonitorConfigHost',
      };
    },
  },
  [ConfigKey.NAME]: {
    fieldKey: ConfigKey.NAME,
    required: true,
    component: EuiFieldText,
    controlled: true,
    label: i18n.translate('xpack.synthetics.monitorConfig.name.label', {
      defaultMessage: 'Monitor name',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.name.helpText', {
      defaultMessage: 'Choose a name to help identify this monitor in the future.',
    }),
    dependencies: [ConfigKey.URLS, ConfigKey.HOSTS],
    customHook: (value: unknown) => ({
      fieldKey: 'nameAlreadyExists',
      func: useMonitorName,
      params: { search: value as string },
      error: i18n.translate('xpack.synthetics.monitorConfig.name.existsError', {
        defaultMessage: 'Monitor name already exists',
      }),
    }),
    validation: () => ({
      validate: {
        notEmpty: (value) => Boolean(value.trim()),
      },
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.name.error', {
      defaultMessage: 'Monitor name is required',
    }),
    props: () => ({
      'data-test-subj': 'syntheticsMonitorConfigName',
    }),
  },
  [ConfigKey.SCHEDULE]: {
    fieldKey: `${ConfigKey.SCHEDULE}.number`,
    required: true,
    component: EuiSelect,
    label: i18n.translate('xpack.synthetics.monitorConfig.frequency.label', {
      defaultMessage: 'Frequency',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.frequency.helpText', {
      defaultMessage:
        'How often do you want to run this test? Higher frequencies will increase your total cost.',
    }),
    dependencies: [ConfigKey.MONITOR_TYPE],
    props: ({ dependencies }) => {
      const [monitorType] = dependencies;
      return {
        'data-test-subj': 'syntheticsMonitorConfigSchedule',
        options: monitorType === DataStream.BROWSER ? BROWSER_SCHEDULES : LIGHTWEIGHT_SCHEDULES,
      };
    },
  },
  [ConfigKey.LOCATIONS]: {
    fieldKey: ConfigKey.LOCATIONS,
    required: true,
    controlled: true,
    component: EuiComboBox as React.ComponentType<EuiComboBoxProps<string>>,
    label: i18n.translate('xpack.synthetics.monitorConfig.locations.label', {
      defaultMessage: 'Locations',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.locations.helpText', {
      defaultMessage:
        'Where do you want to run this test from? Additional locations will increase your total cost.',
    }),
    props: ({
      field,
      setValue,
      locations,
    }: {
      field?: ControllerRenderProps;
      setValue: UseFormReturn['setValue'];
      locations: ServiceLocations;
    }) => {
      return {
        options: Object.values(locations).map((location) => ({
          label: locations?.find((loc) => location.id === loc.id)?.label,
          id: location.id,
          isServiceManaged: location.isServiceManaged,
        })),
        selectedOptions: Object.values(field?.value as ServiceLocations).map((location) => ({
          label: locations?.find((loc) => location.id === loc.id)?.label,
          id: location.id,
          isServiceManaged: location.isServiceManaged,
        })),
        'data-test-subj': 'syntheticsMonitorConfigLocations',
        onChange: (updatedValues: ServiceLocations) => {
          setValue(
            ConfigKey.LOCATIONS,
            updatedValues.map((location) => ({
              id: location.id,
              isServiceManaged: location.isServiceManaged,
            })) as MonitorServiceLocations
          );
        },
      };
    },
  },
  [ConfigKey.TAGS]: {
    fieldKey: ConfigKey.TAGS,
    component: ComboBox,
    label: i18n.translate('xpack.synthetics.monitorConfig.tags.label', {
      defaultMessage: 'Tags',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.tags.helpText', {
      defaultMessage:
        'A list of tags that will be sent with each monitor event. Useful for searching and segmenting data.',
    }),
    controlled: true,
    props: ({ field }) => ({
      selectedOptions: field?.value,
    }),
  },
  [ConfigKey.TIMEOUT]: {
    fieldKey: ConfigKey.TIMEOUT,
    component: EuiFieldNumber,
    label: i18n.translate('xpack.synthetics.monitorConfig.timeout.label', {
      defaultMessage: 'Timeout in seconds',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.timeout.helpText', {
      defaultMessage: 'The total time allowed for testing the connection and exchanging data.',
    }),
    props: () => ({
      min: 1,
      step: 'any',
    }),
    dependencies: [ConfigKey.SCHEDULE],
    validation: ([schedule]) => {
      return {
        validate: (value) => {
          switch (true) {
            case value < 0:
              return i18n.translate('xpack.synthetics.monitorConfig.timeout.greaterThan0Error', {
                defaultMessage: 'Timeout must be greater than or equal to 0.',
              });
            case value > parseFloat((schedule as MonitorFields[ConfigKey.SCHEDULE]).number) * 60:
              return i18n.translate('xpack.synthetics.monitorConfig.timeout.scheduleError', {
                defaultMessage: 'Timemout must be less than the monitor frequency.',
              });
            case !Boolean(`${value}`.match(FLOATS_ONLY)):
              return i18n.translate('xpack.synthetics.monitorConfig.timeout.formatError', {
                defaultMessage: 'Timeout is invalid.',
              });
            default:
              return true;
          }
        },
      };
    },
  },
  [ConfigKey.APM_SERVICE_NAME]: {
    fieldKey: ConfigKey.APM_SERVICE_NAME,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.apmServiceName.label', {
      defaultMessage: 'APM service name',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.apmServiceName.helpText', {
      defaultMessage:
        'Corrseponds to the service.name ECS field from APM. Set this to enable integrations between APM and Synthetics data.',
    }),
    controlled: true,
    props: ({ field }) => ({
      selectedOptions: field?.value,
      'data-test-subj': 'syntheticsMonitorConfigAPMServiceName',
    }),
  },
  [ConfigKey.NAMESPACE]: {
    fieldKey: ConfigKey.NAMESPACE,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.namespace.label', {
      defaultMessage: 'Data stream namespace',
    }),
    helpText: (
      <span>
        {i18n.translate('xpack.synthetics.monitorConfig.namespace.helpText', {
          defaultMessage:
            "Change the default namespace. This setting changes the name of the monitor's data stream. ",
        })}
        <EuiLink href="#" target="_blank">
          {i18n.translate('xpack.synthetics.monitorConfig.namespace.learnMore', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
      </span>
    ),
    controlled: true,
    props: ({ field }) => ({
      selectedOptions: field,
    }),
  },
  [ConfigKey.MAX_REDIRECTS]: {
    fieldKey: ConfigKey.MAX_REDIRECTS,
    component: EuiFieldNumber,
    label: i18n.translate('xpack.synthetics.monitorConfig.maxRedirects.label', {
      defaultMessage: 'Max redirects',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.maxRedirects.helpText', {
      defaultMessage: 'The total number of redirects to follow.',
    }),
    props: () => ({
      min: 0,
      max: 10,
      step: 1,
    }),
    validation: () => ({
      min: 0,
      pattern: WHOLE_NUMBERS_ONLY,
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.maxRedirects.error', {
      defaultMessage: 'Max redirects is invalid.',
    }),
  },
  [ConfigKey.WAIT]: {
    fieldKey: ConfigKey.WAIT,
    component: EuiFieldNumber,
    label: i18n.translate('xpack.synthetics.monitorConfig.wait.label', {
      defaultMessage: 'Wait',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.wait.helpText', {
      defaultMessage:
        'The duration to wait before emitting another ICMP Echo Request if no response is received.',
    }),
    props: () => ({
      min: 1,
      step: 1,
    }),
    validation: () => ({
      min: 1,
      pattern: WHOLE_NUMBERS_ONLY,
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.wait.error', {
      defaultMessage: 'Wait duration is invalid.',
    }),
  },
  [ConfigKey.USERNAME]: {
    fieldKey: ConfigKey.USERNAME,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.username.label', {
      defaultMessage: 'Username',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.username.helpText', {
      defaultMessage: 'Username for authenticating with the server.',
    }),
  },
  [ConfigKey.PASSWORD]: {
    fieldKey: ConfigKey.PASSWORD,
    component: EuiFieldPassword,
    label: i18n.translate('xpack.synthetics.monitorConfig.password.label', {
      defaultMessage: 'Password',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.password.helpText', {
      defaultMessage: 'Password for authenticating with the server.',
    }),
  },
  [ConfigKey.PROXY_URL]: {
    fieldKey: ConfigKey.PROXY_URL,
    component: EuiFieldText,
    label: 'Proxy URL',
    helpText: 'HTTP proxy URL.',
  },
  [ConfigKey.REQUEST_METHOD_CHECK]: {
    fieldKey: ConfigKey.REQUEST_METHOD_CHECK,
    component: EuiSelect,
    label: i18n.translate('xpack.synthetics.monitorConfig.requestMethod.label', {
      defaultMessage: 'Request method',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.requestMethod.helpText', {
      defaultMessage: 'The HTTP method to use.',
    }),
    props: () => ({
      options: Object.keys(HTTPMethod).map((method) => ({
        value: method,
        text: method,
      })),
    }),
  },
  [ConfigKey.REQUEST_HEADERS_CHECK]: {
    fieldKey: ConfigKey.REQUEST_HEADERS_CHECK,
    component: HeaderField,
    label: i18n.translate('xpack.synthetics.monitorConfig.requestHeaders.label', {
      defaultMessage: 'Request headers',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.requestHeaders.helpText', {
      defaultMessage:
        'A dictionary of additional HTTP headers to send. By default the client will set the User-Agent header to identify itself.',
    }),
    controlled: true,
    validation: () => ({
      validate: (headers) => !validateHeaders(headers),
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.requestHeaders.error', {
      defaultMessage: 'Header key must be a valid HTTP token.',
    }),
  },
  [ConfigKey.REQUEST_BODY_CHECK]: {
    fieldKey: ConfigKey.REQUEST_BODY_CHECK,
    component: RequestBodyField,
    label: i18n.translate('xpack.synthetics.monitorConfig.requestBody.label', {
      defaultMessage: 'Request body',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.requestBody.helpText', {
      defaultMessage: 'Request body content.',
    }),
    controlled: true,
  },
  [ConfigKey.RESPONSE_HEADERS_INDEX]: {
    fieldKey: ConfigKey.RESPONSE_HEADERS_INDEX,
    component: EuiCheckbox,
    helpText: (
      <>
        <FormattedMessage
          id="xpack.synthetics.monitorConfig.indexResponseHeaders.helpText"
          defaultMessage="Controls the indexing of the HTTP response headers to "
        />
        <EuiCode>http.response.body.headers</EuiCode>
      </>
    ),
    props: () => ({
      label: i18n.translate('xpack.synthetics.monitorConfig.indexResponseHeaders.label', {
        defaultMessage: 'Index response headers',
      }),
      id: 'syntheticsMonitorConfigResponseHeadersIndex', // checkbox needs an id or it won't work
    }),
    controlled: true,
  },
  [ConfigKey.RESPONSE_BODY_INDEX]: {
    fieldKey: ConfigKey.RESPONSE_BODY_INDEX,
    component: ResponseBodyIndexField,
    helpText: (
      <>
        <FormattedMessage
          id="xpack.synthetics.monitorConfig.indexResponseBody.helpText"
          defaultMessage="Controls the indexing of the HTTP response body contents to"
        />
        <EuiCode>http.response.body.contents</EuiCode>
      </>
    ),
    props: () => ({
      label: i18n.translate('xpack.synthetics.monitorConfig.indexResponseBody.label', {
        defaultMessage: 'Index response body',
      }),
    }),
    controlled: true,
  },
  [ConfigKey.RESPONSE_STATUS_CHECK]: {
    fieldKey: ConfigKey.RESPONSE_STATUS_CHECK,
    component: ComboBox,
    label: i18n.translate('xpack.synthetics.monitorConfig.responseStatusCheck.label', {
      defaultMessage: 'Check response status equals',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.responseStatusCheck.helpText', {
      defaultMessage:
        'A list of expected status codes. Press enter to add a new code. 4xx and 5xx codes are considered down by default. Other codes are considered up.',
    }),
    controlled: true,
    props: ({ field }) => ({
      selectedOptions: field?.value,
    }),
    validation: () => ({
      validate: (value) => {
        const validateFn = validate[DataStream.HTTP][ConfigKey.RESPONSE_STATUS_CHECK];
        if (validateFn) {
          return !validateFn({
            [ConfigKey.RESPONSE_STATUS_CHECK]: value,
          });
        }
      },
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.responseStatusCheck.error', {
      defaultMessage: 'Status code must contain digits only.',
    }),
  },
  [ConfigKey.RESPONSE_HEADERS_CHECK]: {
    fieldKey: ConfigKey.RESPONSE_HEADERS_CHECK,
    component: HeaderField,
    label: i18n.translate('xpack.synthetics.monitorConfig.responseHeadersCheck.label', {
      defaultMessage: 'Check response headers contain',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.responseHeadersCheck.helpText', {
      defaultMessage: 'A list of expected response headers.',
    }),
    controlled: true,
    validation: () => ({
      validate: (headers) => !validateHeaders(headers),
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.responseHeadersCheck.error', {
      defaultMessage: 'Header key must be a valid HTTP token.',
    }),
  },
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: {
    fieldKey: ConfigKey.RESPONSE_BODY_CHECK_POSITIVE,
    component: ComboBox,
    label: i18n.translate('xpack.synthetics.monitorConfig.responseBodyCheck.label', {
      defaultMessage: 'Check response body contains',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.responseBodyCheck.helpText', {
      defaultMessage:
        'A list of regular expressions to match the body output. Press enter to add a new expression. Only a single expression needs to match.',
    }),
    controlled: true,
    props: ({ field }) => ({
      selectedOptions: field?.value,
    }),
  },
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: {
    fieldKey: ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
    component: ComboBox,
    label: i18n.translate('xpack.synthetics.monitorConfig.responseBodyCheckNegative.label', {
      defaultMessage: 'Check response body does not contain',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.responseBodyCheckNegative.helpText', {
      defaultMessage:
        'A list of regular expressions to match the the body output negatively. Press enter to add a new expression. Return match failed if single expression matches.',
    }),
    controlled: true,
    props: ({ field }) => ({
      selectedOptions: field?.value,
    }),
  },
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: {
    fieldKey: ConfigKey.RESPONSE_RECEIVE_CHECK,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.responseReceiveCheck.label', {
      defaultMessage: 'Check response contains',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.responseReceiveCheck.helpText', {
      defaultMessage: 'The expected remote host response.',
    }),
  },
  [`${ConfigKey.PROXY_URL}__tcp`]: {
    fieldKey: ConfigKey.PROXY_URL,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.proxyURLTCP.label', {
      defaultMessage: 'Proxy URL',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.proxyURLTCP.helpText', {
      defaultMessage:
        'The URL of the SOCKS5 proxy to use when connecting to the server. The value must be a URL with a scheme of socks5://.',
    }),
  },
  [ConfigKey.REQUEST_SEND_CHECK]: {
    fieldKey: ConfigKey.REQUEST_SEND_CHECK,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.requestSendCheck.label', {
      defaultMessage: 'Request payload',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.requestSendCheck.helpText', {
      defaultMessage: 'A payload string to send to the remote host.',
    }),
  },
  [ConfigKey.SOURCE_INLINE]: {
    fieldKey: 'source.inline',
    required: true,
    component: SourceField,
    ariaLabel: i18n.translate('xpack.synthetics.monitorConfig.monitorScript.label', {
      defaultMessage: 'Monitor script',
    }),
    controlled: true,
    props: ({ isEdit }) => ({
      isEditFlow: isEdit,
    }),
    validation: () => ({
      validate: (value) => Boolean(value.script),
    }),
    error: i18n.translate('xpack.synthetics.monitorConfig.monitorScript.error', {
      defaultMessage: 'Monitor script is required',
    }),
  },
  isTLSEnabled: {
    fieldKey: 'isTLSEnabled',
    component: EuiSwitch,
    controlled: true,
    props: ({ setValue }) => {
      return {
        id: 'syntheticsMontiorConfigIsTLSEnabledSwitch',
        label: i18n.translate('xpack.synthetics.monitorConfig.customTLS.label', {
          defaultMessage: 'Use custom TLS configuration',
        }),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue('isTLSEnabled', event.target.checked);
        },
      };
    },
  },
  [ConfigKey.TLS_VERIFICATION_MODE]: {
    fieldKey: ConfigKey.TLS_VERIFICATION_MODE,
    component: EuiSelect,
    label: i18n.translate('xpack.synthetics.monitorConfig.verificationMode.label', {
      defaultMessage: 'Verification mode',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.verificationMode.helpText', {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA) and also verifies that the server’s hostname (or IP address) matches the names identified within the certificate. If the Subject Alternative Name is empty, it returns an error.',
    }),
    showWhen: ['isTLSEnabled', true],
    props: () => ({
      options: Object.values(VerificationMode).map((method) => ({
        value: method,
        text: method.toUpperCase(),
      })),
    }),
  },
  [ConfigKey.TLS_VERSION]: {
    fieldKey: ConfigKey.TLS_VERSION,
    component: EuiComboBox as React.ComponentType<EuiComboBoxProps<string>>,
    label: i18n.translate('xpack.synthetics.monitorConfig.tlsVersion.label', {
      defaultMessage: 'Supported TLS protocols',
    }),
    controlled: true,
    showWhen: ['isTLSEnabled', true],
    props: ({
      field,
      setValue,
    }: {
      field?: ControllerRenderProps;
      setValue: UseFormReturn['setValue'];
    }) => {
      return {
        options: Object.values(TLSVersion).map((version) => ({
          label: version,
        })),
        selectedOptions: Object.values(field?.value).map((version) => ({
          label: version,
        })),
        onChange: (updatedValues: Array<EuiComboBoxOptionOption<TLSVersion>>) => {
          setValue(
            ConfigKey.TLS_VERSION,
            updatedValues.map((option) => option.label as TLSVersion)
          );
        },
      };
    },
  },
  [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: {
    fieldKey: ConfigKey.TLS_CERTIFICATE_AUTHORITIES,
    component: EuiTextArea,
    label: i18n.translate('xpack.synthetics.monitorConfig.certificateAuthorities.label', {
      defaultMessage: 'Certificate authorities',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.certificateAuthorities.helpText', {
      defaultMessage: 'PEM formatted custom certificate authorities.',
    }),
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.TLS_CERTIFICATE]: {
    fieldKey: ConfigKey.TLS_CERTIFICATE,
    component: EuiTextArea,
    label: i18n.translate('xpack.synthetics.monitorConfig.clientCertificate.label', {
      defaultMessage: 'Client certificate',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.clientCertificate.helpText', {
      defaultMessage: 'PEM formatted certificate for TLS client authentication.',
    }),
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.TLS_KEY]: {
    fieldKey: ConfigKey.TLS_KEY,
    component: EuiTextArea,
    label: i18n.translate('xpack.synthetics.monitorConfig.clientKey.label', {
      defaultMessage: 'Client key',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.clientKey.helpText', {
      defaultMessage: 'PEM formatted certificate key for TLS client authentication.',
    }),
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.TLS_KEY_PASSPHRASE]: {
    fieldKey: ConfigKey.TLS_KEY_PASSPHRASE,
    component: EuiFieldPassword,
    label: i18n.translate('xpack.synthetics.monitorConfig.clientKeyPassphrase.label', {
      defaultMessage: 'Client key passphrase',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.clientKeyPassphrase.helpText', {
      defaultMessage: 'Certificate key passphrase for TLS client authentication.',
    }),
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.SCREENSHOTS]: {
    fieldKey: ConfigKey.SCREENSHOTS,
    component: EuiButtonGroup,
    label: i18n.translate('xpack.synthetics.monitorConfig.screenshotOptions.label', {
      defaultMessage: 'Screenshot options',
    }),
    helpText: i18n.translate('xpack.synthetics.monitorConfig.screenshotOptions.helpText', {
      defaultMessage: 'Set this option to manage the screenshots captured by the synthetics agent.',
    }),
    controlled: true,
    props: ({
      field,
      setValue,
    }: {
      field?: ControllerRenderProps;
      setValue: UseFormReturn['setValue'];
    }) => ({
      type: 'single',
      idSelected: field?.value,
      onChange: (option: ScreenshotOption) => setValue(ConfigKey.SCREENSHOTS, option),
      options: Object.values(ScreenshotOption).map((option) => ({
        id: option,
        label: option.replace(/-/g, ' '),
      })),
      css: {
        'text-transform': 'capitalize',
      },
    }),
  },
  [ConfigKey.TEXT_ASSERTION]: {
    fieldKey: ConfigKey.TEXT_ASSERTION,
    component: EuiFieldText,
    label: i18n.translate('xpack.synthetics.monitorConfig.textAssertion.label', {
      defaultMessage: 'Text assertion',
    }),
    required: true,
    helpText: i18n.translate('xpack.synthetics.monitorConfig.textAssertion.helpText', {
      defaultMessage: 'Consider the page loaded when the specified text is rendered.',
    }),
    validation: () => ({
      required: true,
    }),
  },
  [ConfigKey.THROTTLING_CONFIG]: {
    fieldKey: ConfigKey.THROTTLING_CONFIG,
    component: EuiSuperSelect,
    label: i18n.translate('xpack.synthetics.monitorConfig.throttling.label', {
      defaultMessage: 'Connection profile',
    }),
    required: true,
    controlled: true,
    helpText: i18n.translate('xpack.synthetics.monitorConfig.throttling.helpText', {
      defaultMessage:
        'Simulate network throttling (download, upload, latency). More options will be added in a future version.',
    }),
    props: () => ({
      options: [
        {
          value: DEFAULT_BROWSER_ADVANCED_FIELDS[ConfigKey.THROTTLING_CONFIG],
          inputDisplay: (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiText>
                  {i18n.translate('xpack.synthetics.monitorConfig.throttling.options.default', {
                    defaultMessage: 'Default',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {'(5 Mbps, 3 Mbps, 20 ms)'}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
      ],
      disabled: true, // currently disabled through 1.0 until we define connection profiles
    }),
    validation: () => ({
      required: true,
    }),
  },
};
