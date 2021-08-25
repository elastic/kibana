/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

import { EuiCard, EuiCodeBlock, EuiDescriptionList, EuiIcon, EuiText } from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import styled from 'styled-components';
import {
  ConsoleServiceInterface,
  CommandDefinition,
  Command,
} from '../../../../../components/console';
import { GetHostPolicyResponse, HostMetadata } from '../../../../../../../common/endpoint/types';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../../../../common/endpoint/constants';

const delay = async (ms: number = 4000) => new Promise((r) => setTimeout(r, ms));

const EuiDescriptionListStyled = styled(EuiDescriptionList)`
  &.euiDescriptionList {
    > .euiDescriptionList__title.title {
      width: 15ch;
      color: ${({ theme }) => theme.eui.euiCodeBlockSectionColor};
    }

    > .euiDescriptionList__description.description {
      width: calc(97% - 15ch);
    }

    > .euiDescriptionList__title.title,
    > .euiDescriptionList__description.description {
      margin-top: ${({ theme }) => theme.eui.paddingSizes.xs};
    }

    > .euiDescriptionList__title.title:first-child,
    > .euiDescriptionList__description.description:first-child {
      margin-top: 0;
    }
  }
`;

export class EndpointConsoleService implements ConsoleServiceInterface {
  constructor(private readonly endpoint: HostMetadata) {}

  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'about',
        about: 'Endpoint information',
        args: undefined,
      },
      {
        name: 'isolate',
        about: 'Isolate the host',
        args: undefined,
      },
      {
        name: 'release',
        about: 'Release a host from its network isolation state',
        args: undefined,
      },
      {
        name: 'run-script',
        about: 'Upload and execute a script on the host machine',
        args: undefined,
      },
      {
        name: 'get-file',
        about: 'Retrieve a file from the host machine',
        args: undefined,
      },
      {
        name: 'get-process',
        about: 'Retrieve a list of running processes from the host',
        args: undefined,
      },
      {
        name: 'terminate-process',
        about: 'Terminate a running process on the host machine',
        args: undefined,
      },
    ];
  }

  async executeCommand(command: Command): Promise<{ result: ReactNode }> {
    switch (command.commandDefinition.name) {
      case 'about':
        return { result: await this.getAboutInfo() };
      case 'get-process':
        return { result: await this.sendGetProcessList() };
      case 'get-file':
        return { result: await this.sendGetFile() };
      default:
        await delay();
        return {
          result: <div>{'action was executed successful'}</div>,
        };
    }
  }

  private async getAboutInfo(): Promise<ReactNode> {
    const aboutInfo: EuiDescriptionListProps['listItems'] = [];

    aboutInfo.push(
      ...Object.entries(this.endpoint.agent).map(([title, description]) => ({
        title,
        description,
      })),
      ...Object.entries(this.endpoint.host.os).map(([title, _description]) => {
        return {
          title: `os.${title}`,
          description:
            'string' !== typeof _description ? JSON.stringify(_description) : _description,
        };
      }),
      {
        title: 'Isolated',
        description: this.endpoint.Endpoint.state?.isolation ? 'Yes' : 'No',
      }
    );

    const policyResponse = (await this.fetchPolicyResponse()).policy_response;

    if (policyResponse) {
      if (policyResponse.agent.build) {
        aboutInfo.push({
          title: 'Build',
          description: policyResponse.agent.build.original,
        });
      }

      aboutInfo.push(
        {
          title: 'artifacts.global',
          description: (
            <EuiDescriptionListStyled
              compressed
              type="column"
              listItems={policyResponse.Endpoint.policy.applied.artifacts.global.identifiers.map(
                ({ name, sha256 }) => ({ title: name, description: sha256 })
              )}
              titleProps={{
                className: 'eui-textTruncate title',
              }}
              descriptionProps={{
                className: 'description',
              }}
            />
          ),
        },
        {
          title: 'artifacts.user',
          description: (
            <EuiDescriptionListStyled
              compressed
              type="column"
              listItems={policyResponse.Endpoint.policy.applied.artifacts.user.identifiers.map(
                ({ name, sha256 }) => ({ title: name, description: sha256 })
              )}
              titleProps={{
                className: 'eui-textTruncate title',
              }}
              descriptionProps={{
                className: 'description',
              }}
            />
          ),
        }
      );
    }

    return (
      <EuiDescriptionListStyled
        type="column"
        listItems={aboutInfo}
        compressed={true}
        titleProps={{
          className: 'eui-textTruncate title',
        }}
        descriptionProps={{
          className: 'description',
        }}
      />
    );
  }

  private async fetchPolicyResponse(): Promise<GetHostPolicyResponse> {
    return KibanaServices.get().http.get(BASE_POLICY_RESPONSE_ROUTE, {
      query: {
        agentId: this.endpoint.agent.id,
      },
    });
  }

  private async sendGetProcessList(): Promise<ReactNode> {
    await delay();

    // output of `get-process` from a windows powershell session
    return (
      <EuiCodeBlock isCopyable={true} paddingSize="s" fontSize="s" transparentBackground={false}>{`
Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
    321      20     7128      15936       0.36   3916   1 ApplicationFrameHost
    175      10     6212      11912       0.09  11748   0 audiodg
    196      24     5480      16644       0.14   1444   1 backgroundTaskHost
    325      30    11404      28688       0.16   5868   1 backgroundTaskHost
    536      27     6868      27600       0.39   7176   1 backgroundTaskHost
    297      19    15360      25864       0.28  11248   1 backgroundTaskHost
    239      13     3884      17892       0.47  11980   1 backgroundTaskHost
    450      19     3980      23228       0.13  12348   1 BackgroundTransferHost
    234      15     6784      12028       0.34   1808   1 chrome
    329      19    52416      46496       7.28   2648   1 chrome
    195      13     6680      10572       0.36   3564   1 chrome
    312      18    13296      24660       9.17   4488   1 chrome
    297      16    22044      35184       1.38   4848   1 chrome
    201      14    10912      12548       0.30   5672   1 chrome
   1481      36   115568      31328      14.47   6592   1 chrome
   1455      51    67132      85120      43.33   6612   1 chrome
    175       9     2104       5308       0.08   7020   1 chrome
    267      16    29044      25392       4.25   8420   1 chrome
    247      15    16688      28108       0.63   8888   1 chrome
    116       6     1064       4244       0.02  11852   0 CompatTelRunner
    423      16    12304      26548       1.22  12632   0 CompatTelRunner
    480      19    20824      31524       3.02  13112   0 CompatTelRunner
    292      14     7316      15508       1.91   1700   1 conhost
    154      10     6668       7392       0.27   3868   0 conhost
    156      10     6660      12992       0.03   6376   0 conhost
    288      14     5596      14500       1.97   7700   1 conhost
    154      10     6664       9740       0.25   7776   0 conhost
    153      10     6760      13808       0.06  12536   0 conhost
    660      25     1876       4720       2.66    472   0 csrss
    484      21     1948       4104       4.44    556   1 csrss
    498      17     7292      15540       5.20   2892   1 ctfmon
    227      22     5528       8936       0.20   7400   1 dllhost
   1046      55    53560      70576      62.98   4388   1 dwm
    295      22    28376      31172      15.16   3172   0 elastic-agent
    961      40   346456     279988     527.81   9900   0 elastic-endpoint
   3290     133    71680     152792     111.80    736   1 explorer
    397      26    66940      75756      12.97    896   0 filebeat
     32       5     1468       2828       0.41    876   0 fontdrvhost
     32       7     2104       4324       0.63    888   1 fontdrvhost
    877      38    24884      72860       7.50  11272   1 GameBar
    468      18     9400      25444       3.11   6952   1 GameBarFTServer
    190      12     2024       1600       0.08  12772   0 GoogleCrashHandler
    165      10     1908       1280       0.06  13072   0 GoogleCrashHandler64
    230      16     3560       8864       0.27   8832   0 GoogleUpdate
    224      15     2560       1100       0.09  10184   0 GoogleUpdate
    402      21     3800      15768       0.45  12904   0 GoogleUpdate
      0       0       60          8                 0   0 Idle
    529      29    15948      26032       0.45   6900   1 LockApp
   1621      26     8400      18308     100.63    724   0 lsass
      0       0      404     117392      13.64   1704   0 Memory Compression
    367      19    37776      45872       4.13  10656   0 metricbeat
    819      53    49944      39088       1.84  12256   1 Microsoft.Photos
    201      13     2500      10868       0.48   5384   0 MicrosoftEdgeUpdate
    171      11     1832       9332       0.22   7704   0 MicrosoftEdgeUpdate
    147       9     1740       8872       0.61   5864   0 MicrosoftEdgeUpdateSetup_X86_1.3.151.27
    835      27   105676      94064      22.50   8344   0 MoUsoCoreWorker
    355      76   191916     107172      25.92  12420   0 MRT
    254      14     7812      16456       0.53  12672   0 msiexec
   1047      88   277388     255968   2,270.34   5844   0 MsMpEng
    226      14     2884       2156       0.19  11952   1 MusNotifyIcon
    215      12     4280       8920       0.27   6120   0 NisSrv
    261      18    11648      23560       4.80   8540   1 notepad++
    788      64    28348      16464       2.13  10808   1 OneDrive
    379      16     7100      46208       3.63  12724   1 OneDriveSetup
    575      21     6292      16000       1.06  13200   1 OneDriveSetup
    564      34    68364      55044       2.72   4836   1 powershell
    697      38    77324      86108       5.38   6672   1 powershell
      0      17     7112      39052       4.69    108   0 Registry
    127       8     1768      10824       0.05   1412   1 RuntimeBroker
    459      23     5456      27860       0.20   3492   1 RuntimeBroker
    339      18     8868      19332       0.78   4532   1 RuntimeBroker
    360      18     6740      24056       8.75   6192   1 RuntimeBroker
    331      17     5712      19172       0.44   6240   1 RuntimeBroker
    786      37    16476      36088      10.72   6444   1 RuntimeBroker
    419      23     8624      21620       1.17   7072   1 RuntimeBroker
    337      21     5892      19536       3.86   7796   1 RuntimeBroker
    388      18     4612      25984       1.14  11048   1 RuntimeBroker
    271      15     3172      20320       0.17  12768   1 RuntimeBroker
    127       9     1860       7836       0.05  12824   1 RuntimeBroker
   1416     102   144384     159364      32.44   6324   1 SearchApp
    138       8     1404       7364       0.03    688   0 SearchFilterHost
    762      55    37176      34352      53.13   5188   0 SearchIndexer
    266      10     1864       7620       0.08   6452   1 SearchProtocolHost
    418      16     4236      12700       2.14   8024   0 SecurityHealthService
    162      10     1724       7508       0.38   7992   1 SecurityHealthSystray
    689      12     5072       8888      19.19    692   0 services
    103       8     4440       6424       0.94   7936   0 SgrmBroker
    720      33    21268      50036       1.27   1384   1 ShellExperienceHost
    670      20     7280      25960      13.88    856   1 sihost
    811      47    31360      59076       9.20    588   1 Skype
    232      18    12136      23284       0.11   1780   1 Skype
    382      23    13768      31896       0.61   4240   1 Skype
   1521      26    24840      36064      33.83   7520   1 Skype
    408      56   117844      55360      51.61   8132   1 Skype
    437      23     7976      24648       0.27  11892   1 smartscreen
     53       3     1088        952       0.14    376   0 smss
    433      22     5340      10252       0.22   2424   0 spoolsv
    149       9     1712       8260       0.06   4052   0 SppExtComObj
    252      11     8188      18388       4.69  10252   0 sppsvc
    637      32    26336      55848       5.97   5516   1 StartMenuExperienceHost
    273      10     2388       6544       2.77     72   0 svchost
    388      19     4508      16104       0.63    828   0 svchost
     54       5      844       2812       0.03    844   0 svchost
   1365      26    13640      28904      18.13    868   0 svchost
   1448      20     9184      15476      37.33    984   0 svchost
    224      12     2380       8800       0.25   1044   0 svchost
    163      10     2148       8096       0.36   1052   0 svchost
    416      15    16608      17252       7.17   1152   0 svchost
    197      10     2264       6504       2.56   1224   0 svchost
    228      12     2400       9412       0.14   1272   0 svchost
    153      30     5916       8844       1.61   1280   0 svchost
    266      11     2468       6704       1.42   1340   0 svchost
    534      24     8336      41236       2.83   1372   1 svchost
    441      19     6916      13604       9.00   1448   0 svchost
    397      15     4760      11108       1.14   1456   0 svchost
    244      13     3256      11624       0.42   1540   0 svchost
    177       9     2068       6660       0.20   1556   0 svchost
    255      16   122340     127248     601.25   1572   0 svchost
    217       7     1340       4792       0.05   1580   0 svchost
    178      10     1976       7296       0.45   1740   0 svchost
    475      14     3604       8440       6.94   1760   0 svchost
    162       9     1812       6636       0.03   1804   0 svchost
    176       9     1760       6460       0.19   1816   0 svchost
    171      10     1960       7192       0.28   1824   0 svchost
    387      24     3496      11524       0.25   1928   0 svchost
    269      11     2708       8996       1.45   2008   0 svchost
    330      15     3600       7800       3.20   2052   0 svchost
    370      14     3176      11652       1.20   2092   0 svchost
    134       9     1736       5332       0.48   2220   0 svchost
    377      14     2828       7712       0.52   2228   0 svchost
    235      14    26364      33944      31.59   2240   0 svchost
    192      12     2220       8180       0.14   2308   0 svchost
    434      32     9056      16040       5.75   2464   0 svchost
    192      11     2084       6588       0.30   2500   0 svchost
    440      16     9292      17972      26.73   2656   0 svchost
    695    1425    50888      54528      47.81   2664   0 svchost
    381      21    19968      24956      23.50   2672   0 svchost
    716      26    19796      33284      21.30   2688   0 svchost
    164       7     1596       5136       0.31   2696   0 svchost
    208      12     2380       8432       0.94   2712   0 svchost
    130       9     1624       5256       0.03   2720   0 svchost
    122       7     1304       4660       0.05   2760   0 svchost
    421      21     5040      19500       0.84   2836   0 svchost
    381      16     3048       9588       0.44   2924   0 svchost
    103       7     1400       4448       0.11   3036   0 svchost
    126       8     1492       5656       0.03   3280   0 svchost
    215      11     2056       6300       0.03   3388   0 svchost
    319      13     3380      17768       2.39   3428   0 svchost
    248      14     2844      10072       0.17   3720   1 svchost
    307      15     5284      15156       1.70   3808   1 svchost
    487      18     5364      16752       1.22   3960   0 svchost
    331      21     4256      13784       0.30   4024   0 svchost
   1146     102   162416     136708     761.14   4036   0 svchost
    273      13     4640      10132       0.67   4184   0 svchost
    296      15     3680      19968       0.88   4720   1 svchost
    914      12     2772       9688      22.03   4952   0 svchost
    491      21     5276      29804       0.42   5624   1 svchost
    230      16     4144      14568       0.25   6096   0 svchost
    208      15     6392       7884       0.11   6728   0 svchost
    245      11     2112       8656       1.34   6968   0 svchost
    140       8     2772       9292       0.30   7036   0 svchost
    139       9     1620       6624       0.05   7180   0 svchost
    168       9     1768       7260       0.05   7948   0 svchost
    111       8     1408       5848       0.03   8280   0 svchost
    477      20     8680      20672       6.02   8288   0 svchost
    210      13     2720       8548       0.22   8612   0 svchost
    360      17     8244      22024       3.47   8616   0 svchost
    226      12     2520       8260       0.36   8984   0 svchost
    223      15     2092       6428       0.31   9148   0 svchost
    117       8     1480       5876       0.06   9704   0 svchost
    759      36    12132      23808       1.66   9904   0 svchost
    483      29    54920      71192      13.89  10876   0 svchost
    175      12     3232      16036       0.48  11508   0 svchost
    493      25     6904      19220      21.59  11720   0 svchost
    190      12     2432      11544       0.13  12284   0 svchost
    152      11     2432      10128       0.08  13032   0 svchost
   3759       0      196        144   2,232.53      4   0 System
    690      35    22484       1196       0.53   8680   1 SystemSettings
    293      35     7492      15364       1.70   4784   1 taskhostw
    432      21     8700      26896       0.97  10076   0 taskhostw
    381      23     8632      16440       3.84  11308   1 taskhostw
    664      30    18780      39728     108.02  11984   1 Taskmgr
    515      24    13648      25952       1.08   3344   1 TextInputHost
    186      58    24576      31872       1.81   2020   0 TiWorker
    155       9     2100       7764       0.14   5128   0 TrustedInstaller
    121      10     1828       7000       0.05   9136   1 UserOOBEBroker
    196      12     2872       6800      16.64   1308   0 VBoxService
    251      13     2552       8232       0.95   7324   1 VBoxTray
     46       5     1404      38228       5.39  10976   0 Windows-KB890830-x64-V5.92
    159      11     1484       4948       0.08    548   0 wininit
    276      12     2576       9688       0.28    644   1 winlogon
    182      10     2580       9868       0.25   8996   0 WmiPrvSE
    253      17     4840      14232       1.14  10104   0 WmiPrvSE
    135       9     1776       8556       0.05  12984   0 wuauclt
    815      53    29444      65784       0.98   4068   1 YourPhone
`}</EuiCodeBlock>
    );
  }

  private async sendGetFile(): Promise<ReactNode> {
    await delay(6000);

    return (
      <EuiCard
        title="endpoint-0000.log"
        onClick={() => {}}
        layout="horizontal"
        display="plain"
        icon={<EuiIcon type="document" size="xl" color="primary" />}
        description={
          <>
            <EuiText className="eui-textBreakAll" color="ButtonText">
              {'Retrieved from: C:\\Program Files\\Elastic\\Endpoint\\state\\log\\'}
            </EuiText>
          </>
        }
        style={{
          marginTop: '1em',
          width: '32%',
        }}
      />
    );
  }
}
