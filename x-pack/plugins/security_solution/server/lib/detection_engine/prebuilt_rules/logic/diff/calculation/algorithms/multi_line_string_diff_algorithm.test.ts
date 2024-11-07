/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreeVersionsOf } from '../../../../../../../../common/api/detection_engine';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  MissingVersion,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine';
import { multiLineStringDiffAlgorithm } from './multi_line_string_diff_algorithm';

describe('multiLineStringDiffAlgorithm', () => {
  it('returns current_version as merged output if there is no update - scenario AAA', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My description.\nThis is a second line.',
      target_version: 'My description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      })
    );
  });

  it('returns current_version as merged output if current_version is different and there is no update - scenario ABA', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My GREAT description.\nThis is a second line.',
      target_version: 'My description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      })
    );
  });

  it('returns target_version as merged output if current_version is the same and there is an update - scenario AAB', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My description.\nThis is a second line.',
      target_version: 'My GREAT description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.target_version,
        diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Target,
      })
    );
  });

  it('returns current_version as merged output if current version is different but it matches the update - scenario ABB', () => {
    const mockVersions: ThreeVersionsOf<string> = {
      base_version: 'My description.\nThis is a second line.',
      current_version: 'My GREAT description.\nThis is a second line.',
      target_version: 'My GREAT description.\nThis is a second line.',
    };

    const result = multiLineStringDiffAlgorithm(mockVersions);

    expect(result).toEqual(
      expect.objectContaining({
        merged_version: mockVersions.current_version,
        diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      })
    );
  });

  describe('if all three versions are different - scenario ABC', () => {
    it('returns a computated merged version without a conflict if 3 way merge is possible', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: `My description.\f\nThis is a second\u2001 line.\f\nThis is a third line.`,
        current_version: `My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a third line.`,
        target_version: `My description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.`,
      };

      const expectedMergedVersion = `My GREAT description.\f\nThis is a second\u2001 line.\f\nThis is a GREAT line.`;

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: expectedMergedVersion,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Merged,
        })
      );
    });

    it('returns the current_version with a conflict if 3 way merge is not possible', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: 'My description.\nThis is a second line.',
        current_version: 'My GREAT description.\nThis is a third line.',
        target_version: 'My EXCELLENT description.\nThis is a fourth.',
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Current,
        })
      );
    });

    it('should handle analyzing long strings', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version:
          '## Triage and analysis\n\n### Investigating High Number of Process and/or Service Terminations\n\nAttackers can stop services and kill processes for a variety of purposes. For example, they can stop services associated with business applications and databases to release the lock on files used by these applications so they may be encrypted, or stop security and backup solutions, etc.\n\nThis rule identifies a high number (10) of service and/or process terminations (stop, delete, or suspend) from the same host within a short time period.\n\n#### Possible investigation steps\n\n- Investigate the script execution chain (parent process tree) for unknown processes. Examine their executable files for prevalence, whether they are located in expected locations, and if they are signed with valid digital signatures.\n- Identify the user account that performed the action and whether it should perform this kind of action.\n- Contact the account owner and confirm whether they are aware of this activity.\n- Investigate other alerts associated with the user/host during the past 48 hours.\n- Check if any files on the host machine have been encrypted.\n\n### False positive analysis\n\n- This activity is unlikely to happen legitimately. Benign true positives (B-TPs) can be added as exceptions if necessary.\n\n### Response and remediation\n\n- Initiate the incident response process based on the outcome of the triage.\n- Isolate the involved host to prevent further destructive behavior, which is commonly associated with this activity.\n- Investigate credential exposure on systems compromised or used by the attacker to ensure all compromised accounts are identified. Reset passwords for these accounts and other potentially compromised credentials, such as email, business systems, and web services.\n- Reimage the host operating system or restore it to the operational state.\n- If any other destructive action was identified on the host, it is recommended to prioritize the investigation and look for ransomware preparation and execution activities.\n- Run a full antimalware scan. This may reveal additional artifacts left in the system, persistence mechanisms, and malware components.\n- Determine the initial vector abused by the attacker and take action to prevent reinfection through the same vector.\n- Using the incident response data, update logging and audit policies to improve the mean time to detect (MTTD) and the mean time to respond (MTTR).\n',
        current_version:
          '## Triage and analysis\n\n### Investigating High Number of Process and/or Service Terminations\n\nAttackers can stop services and kill processes for a variety of purposes. For example, they can stop services associated with business applications and databases to release the lock on files used by these applications so they may be encrypted, or stop security and backup solutions, etc.\n\nThis rule identifies a high number (10) of service and/or process terminations (stop, delete, or suspend) from the same host within a short time period.\n\n#### Possible investigation steps\n\n- Investigate the script execution chain (parent process tree) for unknown processes. Examine their executable files for prevalence, whether they are located in expected locations, and if they are signed with valid digital signatures.\n- Identify the user account that performed the action and whether it should perform this kind of action.\n- Contact the account owner and confirm whether they are aware of this activity.\n- Investigate other alerts associated with the user/host during the past 48 hours.\n- Check if any files on the host machine have been encrypted.\n\n### False positive analysis\n\n- This activity is unlikely to happen legitimately. Benign true positives (B-TPs) can be added as exceptions if necessary.\n\n### Response and remediation\n\n- Initiate the incident response process based on the outcome of the triage.\n- Isolate the involved host to prevent further destructive behavior, which is commonly associated with this activity.\n- Investigate credential exposure on systems compromised or used by the attacker to ensure all compromised accounts are identified. Reset passwords for these accounts and other potentially compromised credentials, such as email, business systems, and web services.\n- Reimage the host operating system or restore it to the operational state.\n- If any other destructive action was identified on the host, it is recommended to prioritize the investigation and look for ransomware preparation and execution activities.\n- Run a full antimalware scan. This may reveal additional artifacts left in the system, persistence mechanisms, and malware components.\n- Determine the initial vector abused by the attacker and take action to prevent reinfection through the same vector.\n',
        target_version:
          '## Triage and analysis\n\n### Investigating Low Number of Process and/or Service Terminations\n\nAttackers can stop services and kill processes for a variety of purposes. For example, they can stop services associated with business applications and databases to release the lock on files used by these applications so they may be encrypted, or stop security and backup solutions, etc.\n\nThis rule identifies a high number (10) of service and/or process terminations (stop, delete, or suspend) from the same host within a short time period.\n\n#### Possible investigation steps\n\n- Investigate the script execution chain (parent process tree) for unknown processes. Examine their executable files for prevalence, whether they are located in expected locations, and if they are signed with valid digital signatures.\n- Identify the user account that performed the action and whether it should perform this kind of action.\n- Contact the account owner and confirm whether they are aware of this activity.\n- Investigate other alerts associated with the user/host during the past 48 hours.\n- Check if any files on the host machine have been encrypted.\n\n### False positive analysis\n\n- This activity is unlikely to happen legitimately. Benign true positives (B-TPs) can be added as exceptions if necessary.\n\n### Response and remediation\n\n- Initiate the incident response process based on the outcome of the triage.\n- Isolate the involved host to prevent further destructive behavior, which is commonly associated with this activity.\n- Investigate credential exposure on systems compromised or used by the attacker to ensure all compromised accounts are identified. Reset passwords for these accounts and other potentially compromised credentials, such as email, business systems, and web services.\n- Reimage the host operating system or restore it to the operational state.\n- If any other destructive action was identified on the host, it is recommended to prioritize the investigation and look for ransomware preparation and execution activities.\n- Run a full antimalware scan. This may reveal additional artifacts left in the system, persistence mechanisms, and malware components.\n- Determine the initial vector abused by the attacker and take action to prevent reinfection through the same vector.\n- Using the incident response data, update logging and audit policies to improve the mean time to detect (MTTD) and the mean time to respond (MTTR).\n',
      };

      const expectedMergedVersion =
        '## Triage and analysis\n\n### Investigating Low Number of Process and/or Service Terminations\n\nAttackers can stop services and kill processes for a variety of purposes. For example, they can stop services associated with business applications and databases to release the lock on files used by these applications so they may be encrypted, or stop security and backup solutions, etc.\n\nThis rule identifies a high number (10) of service and/or process terminations (stop, delete, or suspend) from the same host within a short time period.\n\n#### Possible investigation steps\n\n- Investigate the script execution chain (parent process tree) for unknown processes. Examine their executable files for prevalence, whether they are located in expected locations, and if they are signed with valid digital signatures.\n- Identify the user account that performed the action and whether it should perform this kind of action.\n- Contact the account owner and confirm whether they are aware of this activity.\n- Investigate other alerts associated with the user/host during the past 48 hours.\n- Check if any files on the host machine have been encrypted.\n\n### False positive analysis\n\n- This activity is unlikely to happen legitimately. Benign true positives (B-TPs) can be added as exceptions if necessary.\n\n### Response and remediation\n\n- Initiate the incident response process based on the outcome of the triage.\n- Isolate the involved host to prevent further destructive behavior, which is commonly associated with this activity.\n- Investigate credential exposure on systems compromised or used by the attacker to ensure all compromised accounts are identified. Reset passwords for these accounts and other potentially compromised credentials, such as email, business systems, and web services.\n- Reimage the host operating system or restore it to the operational state.\n- If any other destructive action was identified on the host, it is recommended to prioritize the investigation and look for ransomware preparation and execution activities.\n- Run a full antimalware scan. This may reveal additional artifacts left in the system, persistence mechanisms, and malware components.\n- Determine the initial vector abused by the attacker and take action to prevent reinfection through the same vector.\n';

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          merged_version: expectedMergedVersion,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Merged,
        })
      );
    });
  });

  describe('if base_version is missing', () => {
    it('returns current_version as merged output if current_version and target_version are the same - scenario -AA', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: 'My description.\nThis is a second line.',
        target_version: 'My description.\nThis is a second line.',
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          has_base_version: false,
          base_version: undefined,
          merged_version: mockVersions.current_version,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
        })
      );
    });

    it('returns target_version as merged output if current_version and target_version are different - scenario -AB', () => {
      const mockVersions: ThreeVersionsOf<string> = {
        base_version: MissingVersion,
        current_version: `My GREAT description.\nThis is a second line.`,
        target_version: `My description.\nThis is a second line, now longer.`,
      };

      const result = multiLineStringDiffAlgorithm(mockVersions);

      expect(result).toEqual(
        expect.objectContaining({
          has_base_version: false,
          base_version: undefined,
          merged_version: mockVersions.target_version,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.SOLVABLE,
        })
      );
    });
  });
});
