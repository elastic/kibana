SOC Manager has all of the privileges of a rule author role with the additional privilege of managing the signals index. It can't create the signals index though.

|    Role     | Data Sources | SIEM ML Jobs/Results |    Lists    | Rules/Exceptions | Action Connectors |   Signals/Alerts    |
| :---------: | :----------: | :------------------: | :---------: | :--------------: | :---------------: | :-----------------: |
| SOC Manager | read, write  |         read         | read, write |   read, write    |        all        | read, write, manage |
