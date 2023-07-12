/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TestSubjGenerator {
  (suffix?: string): string;
  withPrefix: (prefix: string) => TestSubjGenerator;
}

export const createTestSubjGenerator = (testSubjPrefix: string): TestSubjGenerator => {
  const testSubjGenerator: TestSubjGenerator = (suffix) => {
    if (suffix) {
      return `${testSubjPrefix}-${suffix}`;
    }
    return testSubjPrefix;
  };

  testSubjGenerator.withPrefix = (prefix: string): TestSubjGenerator => {
    return createTestSubjGenerator(testSubjGenerator(prefix));
  };

  return testSubjGenerator;
};

export const getPolicySettingsFormTestSubjects = (
  formTopLevelTestSubj: string = 'endpointPolicyForm'
) => {
  const genTestSubj = createTestSubjGenerator(formTopLevelTestSubj);
  const malwareTestSubj = genTestSubj.withPrefix('malware');
  const ransomwareTestSubj = genTestSubj.withPrefix('ransomware');
  const memoryTestSubj = genTestSubj.withPrefix('memory');
  const behaviourTestSubj = genTestSubj.withPrefix('behaviour');
  const advancedSectionTestSubj = genTestSubj.withPrefix('advancedSection');
  const windowsEventsTestSubj = genTestSubj.withPrefix('windowsEvents');
  const macEventsTestSubj = genTestSubj.withPrefix('macEvents');
  const linuxEventsTestSubj = genTestSubj.withPrefix('linuxEvents');
  const antivirusTestSubj = genTestSubj.withPrefix('antivirusRegistration');
  const attackSurfaceTestSubj = genTestSubj.withPrefix('attackSurface');

  const testSubj = {
    form: genTestSubj(),

    malware: {
      card: malwareTestSubj(),
      enableDisableSwitch: malwareTestSubj('enableDisableSwitch'),
      protectionPreventRadio: malwareTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: malwareTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: malwareTestSubj('notifyUser-checkbox'),
      notifySupportedVersion: malwareTestSubj('notifyUser-supportedVersion'),
      notifyCustomMessage: malwareTestSubj('notifyUser-customMessage'),
      notifyCustomMessageTooltipIcon: malwareTestSubj('notifyUser-tooltipIcon'),
      notifyCustomMessageTooltipInfo: malwareTestSubj('notifyUser-tooltipInfo'),
      osValuesContainer: malwareTestSubj('osValues'),
      rulesCallout: malwareTestSubj('rulesCallout'),
    },
    ransomware: {
      card: ransomwareTestSubj(),
      lockedCard: ransomwareTestSubj('locked'),
      lockedCardTitle: ransomwareTestSubj('locked-title'),
      enableDisableSwitch: ransomwareTestSubj('enableDisableSwitch'),
      protectionPreventRadio: ransomwareTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: ransomwareTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: ransomwareTestSubj('notifyUser-checkbox'),
      notifySupportedVersion: ransomwareTestSubj('notifyUser-supportedVersion'),
      notifyCustomMessage: ransomwareTestSubj('notifyUser-customMessage'),
      notifyCustomMessageTooltipIcon: ransomwareTestSubj('notifyUser-tooltipIcon'),
      notifyCustomMessageTooltipInfo: ransomwareTestSubj('notifyUser-tooltipInfo'),
      osValuesContainer: ransomwareTestSubj('osValues'),
      rulesCallout: ransomwareTestSubj('rulesCallout'),
    },
    memory: {
      card: memoryTestSubj(),
      lockedCard: memoryTestSubj('locked'),
      lockedCardTitle: memoryTestSubj('locked-title'),
      enableDisableSwitch: memoryTestSubj('enableDisableSwitch'),
      protectionPreventRadio: memoryTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: memoryTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: memoryTestSubj('notifyUser-checkbox'),
      osValuesContainer: memoryTestSubj('osValues'),
      rulesCallout: memoryTestSubj('rulesCallout'),
    },
    behaviour: {
      card: behaviourTestSubj(),
      lockedCard: behaviourTestSubj('locked'),
      lockedCardTitle: behaviourTestSubj('locked-title'),
      enableDisableSwitch: behaviourTestSubj('enableDisableSwitch'),
      protectionPreventRadio: behaviourTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: behaviourTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: behaviourTestSubj('notifyUser-checkbox'),
      osValuesContainer: behaviourTestSubj('osValues'),
      rulesCallout: behaviourTestSubj('rulesCallout'),
    },
    attackSurface: {
      card: attackSurfaceTestSubj(),
      lockedCard: attackSurfaceTestSubj('locked'),
      lockedCardTitle: attackSurfaceTestSubj('locked-title'),
      enableDisableSwitch: attackSurfaceTestSubj('enableDisableSwitch'),
      osValues: attackSurfaceTestSubj('osValues'),
      viewModeValue: attackSurfaceTestSubj('valueLabel'),
    },

    windowsEvents: {
      card: windowsEventsTestSubj(),
      osValueContainer: windowsEventsTestSubj('osValueContainer'),
      optionsContainer: windowsEventsTestSubj('options'),
      credentialsCheckbox: windowsEventsTestSubj('credential_access'),
      dllCheckbox: windowsEventsTestSubj('dll_and_driver_load'),
      dnsCheckbox: windowsEventsTestSubj('dns'),
      fileCheckbox: windowsEventsTestSubj('file'),
      networkCheckbox: windowsEventsTestSubj('network'),
      processCheckbox: windowsEventsTestSubj('process'),
      registryCheckbox: windowsEventsTestSubj('registry'),
      securityCheckbox: windowsEventsTestSubj('security'),
    },
    macEvents: {
      card: macEventsTestSubj(),
      osValueContainer: macEventsTestSubj('osValueContainer'),
      optionsContainer: macEventsTestSubj('options'),
      fileCheckbox: macEventsTestSubj('file'),
      networkCheckbox: macEventsTestSubj('network'),
      processCheckbox: macEventsTestSubj('process'),
    },
    linuxEvents: {
      card: linuxEventsTestSubj(),
      osValueContainer: linuxEventsTestSubj('osValueContainer'),
      optionsContainer: linuxEventsTestSubj('options'),
      fileCheckbox: linuxEventsTestSubj('file'),
      networkCheckbox: linuxEventsTestSubj('network'),
      processCheckbox: linuxEventsTestSubj('process'),
      sessionDataCheckbox: linuxEventsTestSubj('session_data'),
      captureTerminalCheckbox: linuxEventsTestSubj('tty_io'),
    },
    antivirusRegistration: {
      card: antivirusTestSubj(),
      enableDisableSwitch: antivirusTestSubj('switch'),
      osValueContainer: antivirusTestSubj('osValueContainer'),
      viewOnlyValue: antivirusTestSubj('value'),
    },
    advancedSection: {
      container: advancedSectionTestSubj(''),
      showHideButton: advancedSectionTestSubj('showButton'),
      settingsContainer: advancedSectionTestSubj('settings'),
      warningCallout: advancedSectionTestSubj('warning'),
    },
  };

  return testSubj;
};

export const expectIsViewOnly = (ele: HTMLElement): void => {
  expect(ele.querySelectorAll('button:not(.euiLink),input,select,textarea')).toHaveLength(0);
};

/**
 * Create a regular expression with the provided text that ensure it matches the entire string.
 * @param text
 */
export const matchExactTextContent = (text: string): RegExp => {
  // RegExp below taken from: https://github.com/sindresorhus/escape-string-regexp/blob/main/index.js
  return new RegExp(`^${text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')}$`);
};
