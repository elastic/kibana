This user can CRUD rules and signals. The main difference here is the user has

```json
"builtInAlerts": ["all"],
```

privileges whereas the T1 and T2 have "read" privileges which prevents them from creating rules

|        Role         | Data Sources | Security Solution ML Jobs/Results | Lists | Rules/Exceptions | Action Connectors | Signals/Alerts |
| :-----------------: | :----------: | :------------------: | :---: | :--------------: | :---------------: | :------------: |
| Hunter / T3 Analyst | read, write  |         read         | read  |   read, write    |       none        |  read, write   |
