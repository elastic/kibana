SOC Manager has all of the privileges of a rule author role with the additional privilege of creating the signals index and lists indices upon initial visit

|    Role     | Data Sources | SIEM ML Jobs/Results |               Lists               | Rules/Exceptions |          Signals/Alerts           |
| :---------: | :----------: | :------------------: | :-------------------------------: | :--------------: | :-------------------------------: |
| SOC Manager | read, write  |         read         | read, write, create_index, manage |   read, write    | read, write, create_index, manage |
