# Documentation for Beats CM in x-pack kibana

Notes:
Falure to have auth enabled in Kibana will make for a broken UI. UI based errors not yet in place

### Run tests

```
node scripts/jest.js plugins/beats --watch
```

### Run command to fake an enrolling beat (from beats_management dir)

```
node scripts/enroll.js <enrollment token>
```
