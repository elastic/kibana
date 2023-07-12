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
    },
    ransomware: {
      card: ransomwareTestSubj(),
      enableDisableSwitch: ransomwareTestSubj('enableDisableSwitch'),
      protectionPreventRadio: ransomwareTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: ransomwareTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: ransomwareTestSubj('notifyUser-checkbox'),
      notifySupportedVersion: ransomwareTestSubj('notifyUser-supportedVersion'),
      notifyCustomMessage: ransomwareTestSubj('notifyUser-customMessage'),
      notifyCustomMessageTooltipIcon: ransomwareTestSubj('notifyUser-tooltipIcon'),
      notifyCustomMessageTooltipInfo: ransomwareTestSubj('notifyUser-tooltipInfo'),
      osValuesContainer: ransomwareTestSubj('osValues'),
    },
    memory: {
      card: memoryTestSubj(),
      enableDisableSwitch: memoryTestSubj('enableDisableSwitch'),
      protectionPreventRadio: memoryTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: memoryTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: memoryTestSubj('notifyUser-checkbox'),
      osValuesContainer: memoryTestSubj('osValues'),
    },
    behaviour: {
      card: behaviourTestSubj(),
      enableDisableSwitch: behaviourTestSubj('enableDisableSwitch'),
      protectionPreventRadio: behaviourTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: behaviourTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: behaviourTestSubj('notifyUser-checkbox'),
      osValuesContainer: behaviourTestSubj('osValues'),
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
      dnsCheckbox: windowsEventsTestSubj('dns'),
      processCheckbox: windowsEventsTestSubj('process'),
      fileCheckbox: windowsEventsTestSubj('file'),
    },
    macEvents: {
      card: macEventsTestSubj(),
      fileCheckbox: macEventsTestSubj('file'),
    },
    linuxEvents: {
      card: linuxEventsTestSubj(),
      fileCheckbox: linuxEventsTestSubj('file'),
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
  expect(ele.querySelectorAll('button,input,select,textarea')).toHaveLength(0);
};
