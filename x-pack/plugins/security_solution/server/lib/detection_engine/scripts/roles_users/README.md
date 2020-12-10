1. When first starting up elastic, detections will not be available until you visit the page with a SOC Manager role or Platform Engineer role
2. I gave the Hunter role "all" privileges for saved objects management and builtInAlerts so that they can create rules.
3. Rule Author has the ability to create rules and create value lists

|                     Role                     | Data Sources | Security Solution ML Jobs/Results |    Lists    | Rules/Exceptions | Action Connectors |          Signals/Alerts          |
| :------------------------------------------: | :----------: | :-------------------------------: | :---------: | :--------------: | :---------------: | :------------------------------: |
|                  T1 Analyst                  |     read     |               read                |    none     |       read       |       read        |           read, write            |
|                  T2 Analyst                  |     read     |               read                |    read     |       read       |       read        |           read, write            |
|             Hunter / T3 Analyst              | read, write  |               read                |    read     |   read, write    |       read        |           read, write            |
| Rule Author / Manager / Detections Engineer  | read, write  |               read                | read, write |   read, write    |       read        | read, write, view_index_metadata |
|                 SOC Manager                  | read, write  |               read                | read, write |   read, write    |        all        |       read, write, manage        |
| Platform Engineer (data ingest, cluster ops) | read, write  |                all                |     all     |   read, write    |        all        |               all                |
