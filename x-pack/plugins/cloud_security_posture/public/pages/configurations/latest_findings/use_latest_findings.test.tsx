/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupMockServiceWorkerServer } from '../../../test/__jest__/setup_jest_mocks';
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useLatestFindings } from './use_latest_findings';
import { TestProvider } from '../../../test/test_provider';
import { getMockServerServicesSetup, setupMockServiceWorker } from '../../../test/mock_server';
import {
  bsearchFindingsPageDefault,
  bsearchFindingsPageNoResults,
} from '../../../test/handlers/bsearch/findings_page';

const server = setupMockServiceWorker();

describe('useLatestFindings hook', () => {
  setupMockServiceWorkerServer(server);

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <TestProvider {...getMockServerServicesSetup()}>{children}</TestProvider>;
  };

  it('fetches data correctly', async () => {
    server.use(bsearchFindingsPageDefault);
    const { result, waitFor } = renderHook(
      () =>
        useLatestFindings({
          query: {
            bool: {
              must: [],
              filter: [],
              should: [],
              must_not: [],
            },
          },
          sort: [['@timestamp', 'desc']],
          enabled: true,
          pageSize: 25,
        }),
      { wrapper }
    );

    await waitFor(() => result.current.data !== undefined);

    expect(result.current?.data?.pages).toHaveLength(1);
    expect(result.current?.data?.pages[0].page).toHaveLength(2);

    expect(result.current?.data?.pages[0]).toMatchObject({
      total: 2,
      count: {
        passed: 1,
        failed: 1,
      },
    });

    expect(result.current?.data?.pages[0].page[0].raw._source).toMatchObject({
      agent: {
        name: 'cloudbeatVM',
        id: 'a910086b-535d-4e7d-a990-ed9f2c41331d',
        ephemeral_id: 'd259e18a-1694-43c3-8c36-7b5702328daa',
        type: 'cloudbeat',
        version: '8.13.2',
      },
      resource: {
        account_id: '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df',
        sub_type: 'azure-disk',
        account_name: 'csp-team',
        name: 'cloudbeatVM_OsDisk_1_e9c9210de1ea4c39973052db6cf95f9b',
        id: '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/AMIR-QA-RG/providers/Microsoft.Compute/disks/cloudbeatVM_OsDisk_1_e9c9210de1ea4c39973052db6cf95f9b',
        region: 'eastus',
        type: 'cloud-compute',
      },
      cloud_security_posture: {
        package_policy: {
          id: '11281435-a0e0-4452-87ad-0bfc2795648f',
          revision: 4,
        },
      },
      elastic_agent: {
        id: 'a910086b-535d-4e7d-a990-ed9f2c41331d',
        version: '8.13.2',
        snapshot: false,
      },
      rule: {
        references:
          '1. https://docs.microsoft.com/azure/security/fundamentals/azure-disk-encryption-vms-vmss\n2. https://docs.microsoft.com/en-us/azure/security-center/security-center-disk-encryption?toc=%2fazure%2fsecurity%2ftoc.json\n3. https://docs.microsoft.com/azure/security/fundamentals/data-encryption-best-practices#protect-data-at-rest https://docs.microsoft.com/azure/virtual-machines/windows/disk-encryption-portal-quickstart\n4. https://docs.microsoft.com/en-us/rest/api/compute/disks/delete\n5. https://docs.microsoft.com/en-us/rest/api/compute/disks/update#encryptionsettings\n6. https://docs.microsoft.com/en-us/security/benchmark/azure/security-controls-v3-data-protection#dp-5-use-customer-managed-key-option-in-data-at-rest-encryption-when-required\n7. https://docs.microsoft.com/en-us/azure/virtual-machines/windows/disks-enable-customer-managed-keys-powershell\n8. https://docs.microsoft.com/en-us/azure/virtual-machines/disk-encryption',
        impact:
          'Using CMK/BYOK will entail additional management of keys.\n\n**NOTE:** You must have your key vault set up to utilize this.',
        description:
          'Ensure that OS disks (boot volumes) and data disks (non-boot volumes) are encrypted with CMK (Customer Managed Keys).\nCustomer Managed keys can be either ADE or Server Side Encryption (SSE).',
        section: 'Virtual Machines',
        default_value: '',
        version: '1.0',
        rationale:
          "Encrypting the IaaS VM's OS disk (boot volume) and Data disks (non-boot volume) ensures that the entire content is fully unrecoverable without a key, thus protecting the volume from unwanted reads.\nPMK (Platform Managed Keys) are enabled by default in Azure-managed disks and allow encryption at rest.\nCMK is recommended because it gives the customer the option to control which specific keys are used for the encryption and decryption of the disk.\nThe customer can then change keys and increase security by disabling them instead of relying on the PMK key that remains unchanging.\nThere is also the option to increase security further by using automatically rotating keys so that access to disk is ensured to be limited.\nOrganizations should evaluate what their security requirements are, however, for the data stored on the disk.\nFor high-risk data using CMK is a must, as it provides extra steps of security.\nIf the data is low risk, PMK is enabled by default and provides sufficient data security.",
        benchmark: {
          name: 'CIS Microsoft Azure Foundations',
          rule_number: '7.3',
          id: 'cis_azure',
          version: 'v2.0.0',
          posture_type: 'cspm',
        },
        tags: ['CIS', 'AZURE', 'CIS 7.3', 'Virtual Machines'],
        remediation:
          "**From Azure Portal** \n\n**Note:** Disks must be detached from VMs to have encryption changed.\n\n1. Go toÂ `Virtual machines`\n2. For each virtual machine, go toÂ `Settings`\n3. Click onÂ `Disks`\n4. Click the ellipsis (`...`), then click `Detach` to detach the disk from the VM\n5. Now search for `Disks` and locate the unattached disk\n6. Click the disk then select `Encryption`\n7. Change your encryption type, then select your encryption set\n8. Click `Save`\n9. Go back to the VM and re-attach the disk\n\n**From PowerShell**\n\n```\n$KVRGname = 'MyKeyVaultResourceGroup';\n $VMRGName = 'MyVirtualMachineResourceGroup';\n $vmName = 'MySecureVM';\n $KeyVaultName = 'MySecureVault';\n $KeyVault = Get-AzKeyVault -VaultName $KeyVaultName -ResourceGroupName $KVRGname;\n $diskEncryptionKeyVaultUrl = $KeyVault.VaultUri;\n $KeyVaultResourceId = $KeyVault.ResourceId;\n\n Set-AzVMDiskEncryptionExtension -ResourceGroupName $VMRGname -VMName $vmName -DiskEncryptionKeyVaultUrl $diskEncryptionKeyVaultUrl -DiskEncryptionKeyVaultId $KeyVaultResourceId;\n```\n\n**NOTE:** During encryption it is likely that a reboot will be required.\nIt may take up to 15 minutes to complete the process.\n\n**NOTE 2:** This may differ for Linux machines as you may need to set the `-skipVmBackup` parameter",
        audit:
          '**From Azure Portal**\n\n1. Go to `Virtual machines`\n2. For each virtual machine, go to `Settings`\n3. Click on `Disks`\n4. Ensure that the `OS disk` and `Data disks` have encryption set to CMK.\n\n**From PowerShell**\n\n```\n$ResourceGroupName="yourResourceGroupName"\n$DiskName="yourDiskName"\n\n$disk=Get-AzDisk -ResourceGroupName $ResourceGroupName -DiskName $DiskName\n$disk.Encryption.Type\n```',
        name: "Ensure that 'OS and Data' disks are encrypted with Customer Managed Key (CMK)",
        id: '26ff6dff-042f-5901-8191-0e347d113e9e',
        profile_applicability: '* Level 2',
      },
      message:
        'Rule "Ensure that \'OS and Data\' disks are encrypted with Customer Managed Key (CMK)": failed',
      result: {
        evaluation: 'failed',
        evidence: {
          Resource: {
            tenant_id: '4fa94b7d-a743-486f-abcc-6c276c44cf4b',
            subscription_id: 'ef111ee2-6c89-4b09-92c6-5c2321f888df',
            resource_group: 'amir-qa-rg',
            name: 'cloudbeatVM_OsDisk_1_e9c9210de1ea4c39973052db6cf95f9b',
            location: 'eastus',
            id: '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/resourceGroups/AMIR-QA-RG/providers/Microsoft.Compute/disks/cloudbeatVM_OsDisk_1_e9c9210de1ea4c39973052db6cf95f9b',
            type: 'microsoft.compute/disks',
            sku: {
              tier: 'Standard',
              name: 'Standard_LRS',
            },
            properties: {
              publicNetworkAccess: 'Enabled',
              diskMBpsReadWrite: 60,
              supportedCapabilities: {
                diskControllerTypes: 'SCSI, NVMe',
                acceleratedNetwork: true,
                architecture: 'x64',
              },
              LastOwnershipUpdateTime: '2024-05-13T15:42:38.7714104Z',
              diskIOPSReadWrite: 500,
              creationData: {
                imageReference: {
                  id: '/Subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df/Providers/Microsoft.Compute/Locations/eastus/Publishers/canonical/ArtifactTypes/VMImage/Offers/0001-com-ubuntu-server-jammy/Skus/22_04-lts-gen2/Versions/22.04.202405010',
                },
                createOption: 'FromImage',
              },
              hyperVGeneration: 'V2',
              networkAccessPolicy: 'AllowAll',
              provisioningState: 'Succeeded',
              encryption: {
                type: 'EncryptionAtRestWithPlatformKey',
              },
              diskState: 'Attached',
              osType: 'Linux',
              timeCreated: '2024-05-13T15:42:38.7714104Z',
              diskSizeBytes: 32213303296,
              uniqueId: 'e9c9210d-e1ea-4c39-9730-52db6cf95f9b',
              supportsHibernation: true,
              diskSizeGB: 30,
            },
          },
        },
        expected: null,
      },
      cloud: {
        provider: 'azure',
        region: 'eastus',
        account: {
          name: 'csp-team',
          id: '/subscriptions/ef111ee2-6c89-4b09-92c6-5c2321f888df',
        },
      },
      '@timestamp': '2024-05-14T13:29:47.715Z',
      ecs: {
        version: '8.6.0',
      },
      cloudbeat: {
        commit_time: '0001-01-01T00:00:00Z',
        version: '8.13.2',
        policy: {
          commit_time: '0001-01-01T00:00:00Z',
          version: '8.13.2',
        },
      },
      data_stream: {
        namespace: 'default',
        type: 'logs',
        dataset: 'cloud_security_posture.findings',
      },
      host: {
        name: 'cloudbeatVM',
      },
      event: {
        agent_id_status: 'auth_metadata_missing',
        sequence: 1715693351,
        ingested: '2024-05-14T22:55:57Z',
        created: '2024-05-14T13:29:47.715249051Z',
        kind: 'state',
        id: '706770ef-6a0a-43b8-8d0e-2ef98b048727',
        type: ['info'],
        category: ['configuration'],
        dataset: 'cloud_security_posture.findings',
        outcome: 'success',
      },
    });
  });
  it('handles empty data correctly', async () => {
    server.use(bsearchFindingsPageNoResults);
    const { result, waitFor } = renderHook(
      () =>
        useLatestFindings({
          query: {
            bool: {
              must: [],
              filter: [],
              should: [],
              must_not: [],
            },
          },
          sort: [['@timestamp', 'desc']],
          enabled: true,
          pageSize: 25,
        }),
      { wrapper }
    );

    await waitFor(() => result.current.data !== undefined);

    expect(result.current?.data).toEqual({
      pages: [
        {
          page: [],
          total: 0,
          count: {
            passed: 0,
            failed: 0,
          },
        },
      ],
      pageParams: [undefined],
    });
  });
});
