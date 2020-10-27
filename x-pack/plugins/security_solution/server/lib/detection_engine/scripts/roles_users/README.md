|                     Role                     | Data Sources | SIEM ML Jobs/Results |    Lists    | Rules/Exceptions |      Signals/Alerts       |
| :------------------------------------------: | :----------: | :------------------: | :---------: | :--------------: | :-----------------------: |
|                  T1 Analyst                  |     read     |         read         |    read     |       read       |           read            |
|                  T2 Analyst                  |     read     |         read         |    read     |       read       |     read, create_doc      |
|             Hunter / T3 Analyst              | read, write  |         read         |    read     |   read, write    |     read, create_doc      |
| Rule Author / Manager / Detections Engineer  | read, write  |         read         | read, write |   read, write    |        read, write        |
|                 SOC Manager                  | read, write  |         read         | read, write |   read, write    | read, write, create_index |
| Platform Engineer (data ingest, cluster ops) | read, write  |         all          |     all     |   read, write    |            all            |
