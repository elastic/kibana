/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { UseFormReturn } from 'react-hook-form';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCheckbox,
  EuiCode,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiSelect,
  EuiSwitch,
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
  MonacoEditorLangId,
  MonitorFields,
  MonitorServiceLocations,
  ScreenshotOption,
  ServiceLocations,
  TLSVersion,
  VerificationMode,
} from '../types';
import { HeaderField } from '../fields/header_field';
import { RequestBodyField } from '../fields/request_body_field';
import { ResponseBodyIndexField } from '../fields/index_response_body_field';
import { ComboBox } from '../fields/combo_box';
import { SourceField } from '../fields/source_field';
import { DEFAULT_FORM_FIELDS } from './defaults';
import { StepFields } from '../steps/step_fields';
import { validate, validateHeaders, WHOLE_NUMBERS_ONLY, FLOATS_ONLY } from './validation';

export interface FieldMeta {
  fieldKey: string;
  component: React.ComponentType<any>;
  label?: string;
  ariaLabel?: string;
  helpText?: string | React.ReactNode;
  props?: (params: {
    value: any;
    setValue: UseFormReturn['setValue'];
    reset: UseFormReturn['reset'];
    locations: ServiceLocations;
    dependencies: unknown[];
  }) => Record<string, any>;
  controlled?: boolean;
  required?: boolean;
  useSetValue?: boolean;
  customHook?: (value: unknown) => {
    // custom hooks are only supported for controlled components and only supported for determining error validation
    func: Function;
    params: unknown;
    fieldKey: string;
    error: string;
  };
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formOnChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  ) => void;
  showWhen?: [string, any]; // show field when another field equals an arbitrary value
  validation?: (dependencies: unknown[]) => Parameters<UseFormReturn['register']>[1];
  error?: React.ReactNode;
  dependencies?: string[]; // fields that another field may depend for or validation. Values are passed to the validation function
}

export interface AdvancedFieldGroup {
  title: string;
  description: string;
  components: FieldMeta[];
}

export type FieldConfig = Record<
  FormMonitorType,
  {
    step1: FieldMeta[];
    step2: FieldMeta[];
    step3?: FieldMeta[];
    advanced?: AdvancedFieldGroup[];
  }
>;

export type StepKey = 'step1' | 'step2' | 'step3';

interface Step {
  title: string;
  children: React.ReactNode;
}

export type StepMap = Record<FormMonitorType, Step[]>;

const MONITOR_TYPE_STEP: Step = {
  title: 'Select a monitor type',
  children: (
    <StepFields
      description={<p>Choose a monitor that best fits your use case</p>}
      stepKey="step1"
    />
  ),
};
const MONITOR_DETAILS_STEP: Step = {
  title: 'Monitor details',
  children: (
    <StepFields
      description={<p>Provide some details about how your monitor should run</p>}
      stepKey="step2"
    />
  ),
};
const MONITOR_SCRIPT_STEP: Step = {
  title: 'Add a script',
  children: (
    <StepFields
      description={
        <>
          <p>
            Use Elastic Script Recorder to generate a script and then upload it. Alternatively, you
            can write your own Playwright script and paste it in the script editor.
          </p>
          <EuiFlexGroup justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href="https://github.com/elastic/synthetics-recorder/releases/"
                iconType="download"
              >
                Download Script Recorder
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
      stepKey="step3"
    />
  ),
};

export const ADD_MONITOR_STEPS: StepMap = {
  [FormMonitorType.MULTISTEP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP, MONITOR_SCRIPT_STEP],
  [FormMonitorType.SINGLE]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP],
  [FormMonitorType.HTTP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP],
  [FormMonitorType.ICMP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP],
  [FormMonitorType.TCP]: [MONITOR_TYPE_STEP, MONITOR_DETAILS_STEP],
};

export const EDIT_MONITOR_STEPS: StepMap = {
  [FormMonitorType.MULTISTEP]: [MONITOR_SCRIPT_STEP, MONITOR_DETAILS_STEP, MONITOR_SCRIPT_STEP],
  [FormMonitorType.SINGLE]: [MONITOR_DETAILS_STEP],
  [FormMonitorType.HTTP]: [MONITOR_DETAILS_STEP],
  [FormMonitorType.ICMP]: [MONITOR_DETAILS_STEP],
  [FormMonitorType.TCP]: [MONITOR_DETAILS_STEP],
};

const BROWSER_SCHEDULES = [
  {
    value: '5',
    text: 'Every 3 minutes',
  },
  {
    value: '10',
    text: 'Every 10 minutes',
  },
  {
    value: '15',
    text: 'Every 15 minutes',
  },
  {
    value: '30',
    text: 'Every 30 minutes',
  },
  {
    value: '60',
    text: 'Every hour',
  },
  {
    value: '120',
    text: 'Every 2 hours',
  },
  {
    value: '240',
    text: 'Every 4 hours',
  },
];

const LIGHTWEIGHT_SCHEDULES = [
  {
    value: '1',
    text: 'Every 1 minute',
  },
  {
    value: '3',
    text: 'Every 3 minutes',
  },
  {
    value: '5',
    text: 'Every 5 minutes',
  },
  {
    value: '10',
    text: 'Every 10 minutes',
  },
  {
    value: '15',
    text: 'Every 15 minutes',
  },
  {
    value: '30',
    text: 'Every 30 minutes',
  },
  {
    value: '60',
    text: 'Every hour',
  },
];

export const MONITOR_TYPE_CONFIG = {
  [FormMonitorType.MULTISTEP]: {
    id: 'syntheticsMonitorTypeMultiStep',
    label: 'Multistep',
    value: FormMonitorType.MULTISTEP,
    descriptionTitle: 'Multistep Browser Journey',
    description:
      'A lightweight API check to validate the availability of a web service or endpoint.',
    link: '#',
    icon: 'videoPlayer',
    beta: true,
  },
  [FormMonitorType.SINGLE]: {
    id: 'syntheticsMonitorTypeSingle',
    label: 'Single Page',
    value: FormMonitorType.SINGLE,
    descriptionTitle: 'Single Page Browser Test',
    description:
      'A lightweight API check to validate the availability of a web service or endpoint.',
    link: '#',
    icon: 'videoPlayer',
    beta: true,
  },
  [FormMonitorType.HTTP]: {
    id: 'syntheticsMonitorTypeHTTP',
    label: 'HTTP Ping',
    value: FormMonitorType.HTTP,
    descriptionTitle: 'HTTP Ping',
    description:
      'A lightweight API check to validate the availability of a web service or endpoint.',
    link: '#',
    icon: 'online',
    beta: false,
  },
  [FormMonitorType.ICMP]: {
    id: 'syntheticsMonitorTypeICMP',
    label: 'ICMP Ping',
    value: FormMonitorType.ICMP,
    descriptionTitle: 'ICMP Ping',
    description:
      'A lightweight API check to validate the availability of a web service or endpoint.',
    link: '#',
    icon: 'online',
    beta: false,
  },
  [FormMonitorType.TCP]: {
    id: 'syntheticsMonitorTypeTCP',
    label: 'TCP Ping',
    value: FormMonitorType.TCP,
    descriptionTitle: 'TCP Ping',
    description:
      'A lightweight API check to validate the availability of a web service or endpoint.',
    link: '#',
    icon: 'online',
    beta: false,
  },
};

export const FIELD: Record<string, FieldMeta> = {
  [ConfigKey.MONITOR_TYPE]: {
    fieldKey: 'formMonitorType',
    required: true,
    component: MonitorTypeRadioGroup,
    ariaLabel: 'Monitor Type',
    controlled: true,
    props: ({ value, reset }) => ({
      onChange: (_: string, monitorType: FormMonitorType) => {
        const defaultFields = DEFAULT_FORM_FIELDS[monitorType];
        reset(defaultFields);
      },
      selectedOption: value,
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
    label: 'Website URL',
    helpText: 'For example, https://www.elastic.co.',
  },
  [`${ConfigKey.URLS}__http`]: {
    fieldKey: ConfigKey.URLS,
    required: true,
    component: EuiFieldText,
    label: 'URL',
    helpText: 'For example, your service endpoint.',
  },
  [`${ConfigKey.HOSTS}__tcp`]: {
    fieldKey: ConfigKey.HOSTS,
    required: true,
    component: EuiFieldText,
    label: 'Host:Port',
  },
  [`${ConfigKey.HOSTS}__icmp`]: {
    fieldKey: ConfigKey.HOSTS,
    required: true,
    component: EuiFieldText,
    label: 'Host',
  },
  [ConfigKey.NAME]: {
    fieldKey: ConfigKey.NAME,
    required: true,
    component: EuiFieldText,
    controlled: true,
    label: 'Monitor name',
    helpText: 'Choose a name to help identify this monitor in the future.',
    customHook: (value: unknown) => ({
      fieldKey: 'nameAlreadyExists',
      func: useMonitorName,
      params: { search: value as string },
      error: 'Monitor name already exists',
    }),
    validation: () => ({
      validate: {
        notEmpty: (value) => Boolean(value.trim()),
      },
    }),
    error: 'Monitor name is required',
  },
  [ConfigKey.SCHEDULE]: {
    fieldKey: `${ConfigKey.SCHEDULE}.number`,
    required: true,
    component: EuiSelect,
    label: 'Frequency',
    helpText:
      'How often do you want to run this test? Higher frequencies will increase your total cost.',
    dependencies: [ConfigKey.MONITOR_TYPE],
    props: ({ dependencies }) => {
      const [monitorType] = dependencies;
      return {
        options: monitorType === DataStream.BROWSER ? BROWSER_SCHEDULES : LIGHTWEIGHT_SCHEDULES,
      };
    },
  },
  [ConfigKey.LOCATIONS]: {
    fieldKey: ConfigKey.LOCATIONS,
    required: true,
    controlled: true,
    component: EuiComboBox,
    label: 'Locations',
    helpText:
      'Where do you want to run this test from? Additional locations will increase your total cost.',
    props: ({
      value,
      setValue,
      locations,
    }: {
      value: ServiceLocations;
      setValue: UseFormReturn['setValue'];
      locations: ServiceLocations;
    }) => {
      return {
        options: Object.values(locations).map((location) => ({
          label: locations?.find((loc) => location.id === loc.id)?.label,
          id: location.id,
          isServiceManaged: location.isServiceManaged,
        })),
        selectedOptions: Object.values(value).map((location) => ({
          label: locations?.find((loc) => location.id === loc.id)?.label,
          id: location.id,
          isServiceManaged: location.isServiceManaged,
        })),
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
    label: 'Tags',
    helpText:
      'A list of tags that will be sent with each monitor event. Useful for searching and segmenting data.',
    controlled: true,
    props: ({ value }: { value: string[] }) => ({
      selectedOptions: value,
    }),
  },
  [ConfigKey.TIMEOUT]: {
    fieldKey: ConfigKey.TIMEOUT,
    component: EuiFieldNumber,
    label: 'Timeout in seconds',
    helpText: 'The total time allowed for testing the connection and exchanging data.',
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
              return 'Timeout must be greater than or equal to 0.';
            case value > parseFloat((schedule as MonitorFields[ConfigKey.SCHEDULE]).number) * 60:
              return 'Timemout must be less than the monitor frequency.';
            case !Boolean(`${value}`.match(FLOATS_ONLY)):
              return 'Timeout is invalid.';
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
    label: 'APM service name',
    helpText:
      'Corrseponds to the service.name ECS field from APM. Set this to enable integrations between APM and Synthetics data.',
    controlled: true,
    props: ({ value }: { value: string[] }) => ({
      selectedOptions: value,
    }),
  },
  [ConfigKey.NAMESPACE]: {
    fieldKey: ConfigKey.NAMESPACE,
    component: EuiFieldText,
    label: 'Data stream namespace',
    helpText: (
      <span>
        {
          "Change the default namespace. This setting changes the name of the monitor's data stream. "
        }
        <EuiLink href="#">Learn More</EuiLink>
      </span>
    ),
    controlled: true,
    props: ({ value }: { value: string[] }) => ({
      selectedOptions: value,
    }),
  },
  [ConfigKey.MAX_REDIRECTS]: {
    fieldKey: ConfigKey.MAX_REDIRECTS,
    component: EuiFieldNumber,
    label: 'Max redirects',
    helpText: 'The total number of redirects to follow.',
    props: () => ({
      min: 0,
      max: 10,
      step: 1,
    }),
    validation: () => ({
      min: 0,
      pattern: WHOLE_NUMBERS_ONLY,
    }),
    error: 'Max redirects is invalid.',
  },
  [ConfigKey.WAIT]: {
    fieldKey: ConfigKey.WAIT,
    component: EuiFieldNumber,
    label: 'Wait',
    helpText:
      'The duration to wait before emitting another ICMP Echo Request if no response is received.',
    props: () => ({
      min: 1,
      step: 1,
    }),
    validation: () => ({
      min: 1,
      pattern: WHOLE_NUMBERS_ONLY,
    }),
    error: 'Wait duration is invalid.',
  },
  [ConfigKey.USERNAME]: {
    fieldKey: ConfigKey.USERNAME,
    component: EuiFieldText,
    label: 'Username',
    helpText: 'Username for authenticating with the server.',
  },
  [ConfigKey.PASSWORD]: {
    fieldKey: ConfigKey.PASSWORD,
    component: EuiFieldPassword,
    label: 'Password',
    helpText: 'Password for authenticating with the server.',
  },
  [ConfigKey.PROXY_URL]: {
    fieldKey: ConfigKey.PROXY_URL,
    component: EuiFieldText,
    label: 'Proxy URL',
    helpText: 'HTTP Proxy URL.',
  },
  [ConfigKey.REQUEST_METHOD_CHECK]: {
    fieldKey: ConfigKey.REQUEST_METHOD_CHECK,
    component: EuiSelect,
    label: 'Request Method',
    helpText: 'The HTTP method to use.',
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
    label: 'Request Headers',
    helpText:
      'A dictionary of additional HTTP headers to send. By default the client will set the User-Agent header to identify itself.',
    controlled: true,
    validation: () => ({
      validate: (headers) => !validateHeaders(headers),
    }),
    error: 'Header key must be a valid HTTP token.',
  },
  [ConfigKey.REQUEST_BODY_CHECK]: {
    fieldKey: ConfigKey.REQUEST_BODY_CHECK,
    component: RequestBodyField,
    label: 'Request Body',
    helpText: 'Request body content.',
    controlled: true,
  },
  [ConfigKey.RESPONSE_HEADERS_INDEX]: {
    fieldKey: ConfigKey.RESPONSE_HEADERS_INDEX,
    component: EuiCheckbox,
    helpText: (
      <>
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseHeaders.helpText"
          defaultMessage="Controls the indexing of the HTTP response headers to "
        />
        <EuiCode>http.response.body.headers</EuiCode>
      </>
    ),
    props: () => ({
      label: 'Index response headers',
      id: 'sampleId', // checkbox needs an id or it won't work
    }),
    controlled: true,
  },
  [ConfigKey.RESPONSE_BODY_INDEX]: {
    fieldKey: ConfigKey.RESPONSE_BODY_INDEX,
    component: ResponseBodyIndexField,
    helpText: (
      <>
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.httpAdvancedOptions.indexResponseHeaders.helpText"
          defaultMessage="Controls the indexing of the HTTP response body contents to"
        />
        <EuiCode>http.response.body.contents</EuiCode>
      </>
    ),
    props: () => ({
      label: 'Index response body',
    }),
    controlled: true,
  },
  [ConfigKey.RESPONSE_STATUS_CHECK]: {
    fieldKey: ConfigKey.RESPONSE_STATUS_CHECK,
    component: ComboBox,
    label: 'Check response status equals',
    helpText:
      'A list of expected status codes. Press enter to add a new code. 4xx and 5xx codes are considered down by default. Other codes are considered up.',
    controlled: true,
    props: ({ value }: { value: string[] }) => ({
      selectedOptions: value,
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
    error: 'Status code must contain digits only.',
  },
  [ConfigKey.RESPONSE_HEADERS_CHECK]: {
    fieldKey: ConfigKey.RESPONSE_HEADERS_CHECK,
    component: HeaderField,
    label: 'Check response headers contain',
    helpText: 'A list of expected response headers.',
    controlled: true,
    validation: () => ({
      validate: (headers) => !validateHeaders(headers),
    }),
    error: 'Header key must be a valid HTTP token.',
  },
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: {
    fieldKey: ConfigKey.RESPONSE_BODY_CHECK_POSITIVE,
    component: ComboBox,
    label: 'Check response body contains',
    helpText:
      'A list of regular expressions to match the body output. Press enter to add a new expression. Only a single expression needs to match.',
    controlled: true,
    props: ({ value }: { value: string[] }) => ({
      selectedOptions: value,
    }),
  },
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: {
    fieldKey: ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
    component: ComboBox,
    label: 'Check response body does not contain',
    helpText:
      'A list of regular expressions to match the the body output negatively. Press enter to add a new expression. Return match failed if single expression matches.',
    controlled: true,
    props: ({ value }: { value: string[] }) => ({
      selectedOptions: value,
    }),
  },
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: {
    fieldKey: ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE,
    component: EuiFieldText,
    label: 'Check response contains.',
    helpText: 'The expected remote host response.',
  },
  [`${ConfigKey.PROXY_URL}__tcp`]: {
    fieldKey: ConfigKey.PROXY_URL,
    component: EuiFieldText,
    label: 'Proxy URL',
    helpText:
      'The URL of the SOCKS5 proxy to use when connecting to the server. The value must be a URL with a scheme of socks5://.',
  },
  [ConfigKey.REQUEST_SEND_CHECK]: {
    fieldKey: ConfigKey.REQUEST_SEND_CHECK,
    component: EuiFieldText,
    label: 'Request payload',
    helpText: 'A payload string to send to the remote host.',
  },
  [ConfigKey.SOURCE_INLINE]: {
    fieldKey: 'source.inline',
    required: true,
    component: SourceField,
    ariaLabel: 'Monitor script',
    controlled: true,
    props: () => ({
      id: 'javascript',
      languageId: MonacoEditorLangId.JAVASCRIPT,
    }),
    validation: () => ({
      validate: (value) => Boolean(value.script),
    }),
    error: 'Monitor script is required',
  },
  isTLSEnabled: {
    fieldKey: 'isTLSEnabled',
    component: EuiSwitch,
    controlled: true,
    props: ({ setValue }) => {
      return {
        id: 'syntheticsIsTLSEnabledSwitch',
        label: 'Use custom TLS configuration',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue('isTLSEnabled', event.target.checked);
        },
      };
    },
  },
  [ConfigKey.TLS_VERIFICATION_MODE]: {
    fieldKey: ConfigKey.TLS_VERIFICATION_MODE,
    component: EuiSelect,
    label: 'Verification Mode',
    helpText:
      'Verifies that the provided certificate is signed by a trusted authority (CA) and also verifies that the server’s hostname (or IP address) matches the names identified within the certificate. If the Subject Alternative Name is empty, it returns an error.',
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
    component: EuiComboBox,
    label: 'Supported TLS protocols',
    controlled: true,
    showWhen: ['isTLSEnabled', true],
    props: ({ value, setValue }: { value: string[]; setValue: UseFormReturn['setValue'] }) => {
      return {
        options: Object.values(TLSVersion).map((version) => ({
          label: version,
        })),
        selectedOptions: Object.values(value).map((version) => ({
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
    label: 'Certificate Authorities',
    helpText: 'PEM formatted custom certificate authorities.',
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.TLS_CERTIFICATE]: {
    fieldKey: ConfigKey.TLS_CERTIFICATE,
    component: EuiTextArea,
    label: 'Client certificate',
    helpText: 'PEM formatted certificate for TLS client authentication.',
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.TLS_KEY]: {
    fieldKey: ConfigKey.TLS_KEY,
    component: EuiTextArea,
    label: 'Client key',
    helpText: 'PEM formatted certificate key for TLS client authentication.',
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.TLS_KEY_PASSPHRASE]: {
    fieldKey: ConfigKey.TLS_KEY_PASSPHRASE,
    component: EuiFieldPassword,
    label: 'Client key passphrase',
    helpText: 'Certificate key passphrase for TLS client authentication.',
    showWhen: ['isTLSEnabled', true],
  },
  [ConfigKey.SCREENSHOTS]: {
    fieldKey: ConfigKey.SCREENSHOTS,
    component: EuiButtonGroup,
    label: 'Screenshot options',
    helpText: 'Set this option to manage the screenshots captured by the synthetics agent.',
    controlled: true,
    props: ({
      value,
      setValue,
    }: {
      value: ScreenshotOption;
      setValue: UseFormReturn['setValue'];
    }) => ({
      type: 'single',
      idSelected: value,
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
};

const TLS_OPTIONS = {
  title: 'TLS Options',
  description: 'TLS Description',
  components: [
    FIELD.isTLSEnabled,
    FIELD[ConfigKey.TLS_VERIFICATION_MODE],
    FIELD[ConfigKey.TLS_VERSION],
    FIELD[ConfigKey.TLS_CERTIFICATE_AUTHORITIES],
    FIELD[ConfigKey.TLS_CERTIFICATE],
    FIELD[ConfigKey.TLS_KEY],
    FIELD[ConfigKey.TLS_KEY_PASSPHRASE],
  ],
};

const DEFAULT_DATA_OPTIONS = {
  title: 'Data options',
  description: 'A description goes here',
  components: [
    FIELD[ConfigKey.TAGS],
    FIELD[ConfigKey.APM_SERVICE_NAME],
    FIELD[ConfigKey.NAMESPACE],
  ],
};

export const HTTP_ADVANCED = {
  requestConfig: {
    title: 'Request configuration',
    description:
      'Configure an optional request to send to the remote host including method, body, and headers.',
    components: [
      FIELD[ConfigKey.USERNAME],
      FIELD[ConfigKey.PASSWORD],
      FIELD[ConfigKey.PROXY_URL],
      FIELD[ConfigKey.REQUEST_METHOD_CHECK],
      FIELD[ConfigKey.REQUEST_HEADERS_CHECK],
      FIELD[ConfigKey.REQUEST_BODY_CHECK],
    ],
  },
  responseConfig: {
    title: 'Response configuration',
    description: 'Control the indexing of the HTTP response contents.',
    components: [FIELD[ConfigKey.RESPONSE_HEADERS_INDEX], FIELD[ConfigKey.RESPONSE_BODY_INDEX]],
  },
  responseChecks: {
    title: 'Response checks',
    description: 'Configure the expected HTTP response.',
    components: [
      FIELD[ConfigKey.RESPONSE_STATUS_CHECK],
      FIELD[ConfigKey.RESPONSE_HEADERS_CHECK],
      FIELD[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE],
      FIELD[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE],
    ],
  },
};

export const TCP_ADVANCED = {
  requestConfig: {
    title: 'Request configuration',
    description: 'Configure the payload sent to the remote host.',
    components: [FIELD[`${ConfigKey.PROXY_URL}__tcp`], FIELD[ConfigKey.REQUEST_SEND_CHECK]],
  },
  responseChecks: {
    title: 'Response checks',
    description: 'Configure the expected response from the remote host.',
    components: [FIELD[ConfigKey.RESPONSE_RECEIVE_CHECK]],
  },
};

export const FIELD_CONFIG: FieldConfig = {
  [FormMonitorType.HTTP]: {
    step1: [FIELD[ConfigKey.MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.URLS}__http`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.MAX_REDIRECTS],
      FIELD[ConfigKey.TIMEOUT],
    ],
    advanced: [
      DEFAULT_DATA_OPTIONS,
      HTTP_ADVANCED.requestConfig,
      HTTP_ADVANCED.responseConfig,
      HTTP_ADVANCED.responseChecks,
      TLS_OPTIONS,
    ],
  },
  [FormMonitorType.TCP]: {
    step1: [FIELD[ConfigKey.MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.HOSTS}__tcp`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.TIMEOUT],
    ],
    advanced: [
      DEFAULT_DATA_OPTIONS,
      TCP_ADVANCED.requestConfig,
      TCP_ADVANCED.responseChecks,
      TLS_OPTIONS,
    ],
  },
  [FormMonitorType.MULTISTEP]: {
    step1: [FIELD[ConfigKey.MONITOR_TYPE]],
    step2: [FIELD[ConfigKey.NAME], FIELD[ConfigKey.LOCATIONS], FIELD[ConfigKey.SCHEDULE]],
    step3: [FIELD[ConfigKey.SOURCE_INLINE]],
    advanced: [
      {
        ...DEFAULT_DATA_OPTIONS,
        components: [
          FIELD[ConfigKey.TAGS],
          FIELD[ConfigKey.APM_SERVICE_NAME],
          FIELD[ConfigKey.SCREENSHOTS],
          FIELD[ConfigKey.NAMESPACE],
        ],
      },
    ],
  },
  [FormMonitorType.SINGLE]: {
    step1: [FIELD[ConfigKey.MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.URLS}__single`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
    ],
    advanced: [
      {
        ...DEFAULT_DATA_OPTIONS,
        components: [
          FIELD[ConfigKey.TAGS],
          FIELD[ConfigKey.APM_SERVICE_NAME],
          FIELD[ConfigKey.SCREENSHOTS],
          FIELD[ConfigKey.NAMESPACE],
        ],
      },
    ],
  },
  [FormMonitorType.ICMP]: {
    step1: [FIELD[ConfigKey.MONITOR_TYPE]],
    step2: [
      FIELD[`${ConfigKey.HOSTS}__icmp`],
      FIELD[ConfigKey.NAME],
      FIELD[ConfigKey.LOCATIONS],
      FIELD[ConfigKey.SCHEDULE],
      FIELD[ConfigKey.WAIT],
      FIELD[ConfigKey.TIMEOUT],
    ],
    advanced: [DEFAULT_DATA_OPTIONS],
  },
};
