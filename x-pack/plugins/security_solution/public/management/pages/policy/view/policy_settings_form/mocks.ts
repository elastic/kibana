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
  const genMalwareTestSubj = genTestSubj.withPrefix('malware');
  const genRansomwareTestSubj = genTestSubj.withPrefix('ransomware');
  const genMemoryTestSubj = genTestSubj.withPrefix('memory');
  const genBehaviourTestSubj = genTestSubj.withPrefix('behaviour');
  const advancedSectionTestSubj = genTestSubj.withPrefix('advancedSection');

  const testSubj = {
    form: genTestSubj(),

    malware: {
      card: genMalwareTestSubj(),
      enableDisableSwitch: genMalwareTestSubj('enableDisableSwitch'),
      protectionPreventRadio: genMalwareTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: genMalwareTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: genMalwareTestSubj('notifyUser-checkbox'),
      osValuesContainer: genMalwareTestSubj('osValues'),
    },
    ransomware: {
      card: genRansomwareTestSubj(),
      enableDisableSwitch: genRansomwareTestSubj('enableDisableSwitch'),
      protectionPreventRadio: genRansomwareTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: genRansomwareTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: genRansomwareTestSubj('notifyUser-checkbox'),
      osValuesContainer: genRansomwareTestSubj('osValues'),
    },
    memory: {
      card: genMemoryTestSubj(),
      enableDisableSwitch: genMemoryTestSubj('enableDisableSwitch'),
      protectionPreventRadio: genMemoryTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: genMemoryTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: genMemoryTestSubj('notifyUser-checkbox'),
      osValuesContainer: genMemoryTestSubj('osValues'),
    },
    behaviour: {
      card: genBehaviourTestSubj(),
      enableDisableSwitch: genBehaviourTestSubj('enableDisableSwitch'),
      protectionPreventRadio: genBehaviourTestSubj('protectionLevel-preventRadio'),
      protectionDetectRadio: genBehaviourTestSubj('protectionLevel-detectRadio'),
      notifyUserCheckbox: genBehaviourTestSubj('notifyUser-checkbox'),
      osValuesContainer: genBehaviourTestSubj('osValues'),
    },
    attachSurface: {
      card: genTestSubj('attackSurface'),
      enableDisableSwitch: genTestSubj('attachSurface-enableDisableSwitch'),
      osValuesContainer: genTestSubj('attackSurface-osValues'),
    },

    windowsEvents: {
      card: genTestSubj('windowsEvents'),
    },
    macEvents: {
      card: genTestSubj('macEvents'),
    },
    linuxEvents: {
      card: genTestSubj('linuxEvents'),
    },
    antivirusRegistration: {
      card: genTestSubj('antivirusRegistration'),
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
